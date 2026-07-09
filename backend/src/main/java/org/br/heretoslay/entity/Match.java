package org.br.heretoslay.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.apache.kafka.common.protocol.types.Field;
import org.br.heretoslay.entity.Card.*;
import org.br.heretoslay.entity.Card.CardEffects.CompositeCardEffect;
import org.br.heretoslay.entity.Card.CardEffects.DestroyCardEffect;
import org.br.heretoslay.entity.Card.CardEffects.DiscardForEffect;
import org.br.heretoslay.entity.Card.CardEffects.StealCardEffect;
import org.br.heretoslay.entity.Card.CardEffects.StealHandEffect;
import org.br.heretoslay.entity.Card.CardEffects.StealHandWithBonusIfTypeEffect;
import org.br.heretoslay.entity.Card.CardEffects.SwapSelfForStolenHeroEffect;
import org.br.heretoslay.entity.Card.CardEffects.StealAndUseEffectImmediatelyEffect;
import org.br.heretoslay.match.MatchService;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;


public class Match {

    private final Map<String, GameState> players = new ConcurrentHashMap<>();
    private List<String> turnOrder = new ArrayList<>();
    private List<String> availablePartyLeaders = new ArrayList<>(
            Arrays.stream(PartyLeader.values())
                    .map(Enum::name)
                    .collect(Collectors.toList())
    );
    private int currentLeaderPickerIndex = 0;
    private MatchState matchState;
    private int currentPlayerTurnIndex = 0;
    private Stack<Card> drawPile = new Stack<>();
    private List<Card> discardPile = new ArrayList<>();
    private boolean challengeWindowOpen = false;
    private Card currentHeroCard = null;
    private String currentHeroPlayer = null;
    private Set<String> challengers = new HashSet<>();
    @JsonIgnore
    private Timer challengeTimer = new Timer();
    private Map<String, Integer> duelRolls = new HashMap<>();
    private String duelChallenger = null;
    private long challengeWindowRemainingTime;
    private long challengeWindowStartTime;
    private long challengeWindowDuration = 10000;
    private final Long matchId;
    private final List<MatchState> forbiddenTurnChange = new ArrayList<>(
            Arrays.asList(MatchState.CHALLENGE_WINDOW, MatchState.CHALLENGE_ROLL, MatchState.SELECTING_CARDS, MatchState.SELECTING_HAND_CARDS, MatchState.SELECTING_PLAYER)
    );

    @JsonIgnore
    private final GameEventBus eventBus = new GameEventBus();
    // MVP simplification: all 15 base monsters sit face-up on the board for the
    // whole match, instead of a shuffled monster deck revealing a few at a time.
    // Not Jackson-serializable (MonsterCard carries CardEffect strategy objects with
    // no data properties) - excluded from match-state-store snapshots. Harmless: the
    // board is deterministically rebuilt by this same field initializer either way.
    @JsonIgnore
    private final List<MonsterCard> monsterBoard = createMonsterBoard();

    private boolean modifierWindowOpen = false;
    private String modifierWindowContext;
    private Set<String> modifierWindowLegalTargets = Collections.emptySet();
    private final Map<String, Integer> pendingModifierDelta = new ConcurrentHashMap<>();
    private Timer modifierWindowTimer;
    private static final long MODIFIER_WINDOW_DURATION = 5000;

    private Long pendingMonsterId;
    private String pendingMonsterAttacker;
    private Integer pendingMonsterRoll;

    public Match(Long matchId, List<Player> startingPlayers) {
        this.matchId = matchId;
        for (Player player : startingPlayers) {
            GameState gameState = new GameState(player.getUsername(), player.getId());
            players.put(player.getId().toString(), gameState);
        }
        matchState = MatchState.ORDER_SELECTION;
        drawPile = CardDeck.createDeck();
        Collections.shuffle(drawPile);
    }

    private static List<MonsterCard> createMonsterBoard() {
        long base = 9000;
        return new ArrayList<>(List.of(
                MonsterFactory.abyssQueen(base + 1), MonsterFactory.anuranCauldron(base + 2),
                MonsterFactory.articAries(base + 3), MonsterFactory.bloodwing(base + 4),
                MonsterFactory.corruptedSabretooth(base + 5), MonsterFactory.crownedSerpent(base + 6),
                MonsterFactory.darkDragonKing(base + 7), MonsterFactory.dracos(base + 8),
                MonsterFactory.malamammoth(base + 9), MonsterFactory.megaSlime(base + 10),
                MonsterFactory.orthus(base + 11), MonsterFactory.rexMajor(base + 12),
                MonsterFactory.terratuga(base + 13), MonsterFactory.titanWyvern(base + 14),
                MonsterFactory.warwornOwlbear(base + 15)
        ));
    }

    @JsonIgnore
    public GameEventBus getEventBus() {
        return eventBus;
    }

    public String getPlayerId(GameState gameState) {
        return players.entrySet().stream()
                .filter(entry -> entry.getValue() == gameState)
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
    }

    public Map<String, GameState> getPlayers() {
        return players;
    }

    public List<Card> getDiscardPile() {
        return discardPile;
    }

    public void performAction(String playerId, String action, JSONObject json) {

        if (action.equals("play_modifier")) {
            handlePlayModifier(playerId, json);
            return;
        }

        if (action.equals("attempt_slay_monster")) {
            if (!turnOrder.get(currentPlayerTurnIndex).equals(playerId)) return;
            GameState attackerState = players.get(playerId);
            if (attackerState.getCurrentAP() <= 0 || matchState != MatchState.GAMEPLAY) return;

            JSONObject slayPayload = json.getJSONObject("payload");
            Long monsterId = slayPayload.getLong("monster_id");
            Optional<MonsterCard> monsterOpt = monsterBoard.stream().filter(m -> m.getCardId().equals(monsterId)).findFirst();
            if (monsterOpt.isEmpty() || !monsterOpt.get().meetsPartyRequirement(attackerState)) return;

            pendingMonsterId = monsterId;
            pendingMonsterAttacker = playerId;
            matchState = MatchState.WAITING_MONSTER_ROLL;

            JSONObject startMsg = new JSONObject();
            startMsg.put("type", "animation");
            startMsg.put("subtype", "monster_attack_start");
            startMsg.put("payload", new JSONObject().put("monsterId", monsterId).put("playerId", playerId));
            broadcast(startMsg.toString());

            JSONObject slayResponse = new JSONObject();
            slayResponse.put("type", "match");
            slayResponse.put("subtype", "match_state");
            slayResponse.put("payload", getMatchState());
            broadcast(slayResponse.toString());
            return;
        }

        if (!turnOrder.get(currentPlayerTurnIndex).equals(playerId)) return;
        GameState gameState = players.get(playerId);

        switch (action) {
            case "draw_card":
                drawCard(gameState);
                gameState.setCurrentAP(gameState.getCurrentAP() - 1);
                break;

            case "play_card":
                playCard(gameState, json.getJSONObject("payload").getLong("card_id"));
                break;

            case "use_card":
                useCard(gameState, json.getJSONObject("payload").getLong("card_id"));
                break;
            case "process_hero_roll":
                int roll = json.getJSONObject("payload").getInt("roll");
                processHeroDiceRoll(gameState, roll);
                gameState.setCurrentAP(gameState.getCurrentAP() - 1);
                break;

            case "apply_card_effects":
                Card pendingHero = gameState.getPendingHeroCard();
                gameState.clearLastDrawnCards();
                pendingHero.getEffect().applyEffect(this, gameState);
                if (gameState.getPendingHeroCard() != null && gameState.getPendingHeroCard() != pendingHero) {
                    // A nested effect (e.g. Wiggles stealing-and-using a hero) queued up a
                    // freshly-acquired hero to roll for - let it play through the normal
                    // WAITING_HERO_ROLL flow instead of clearing it below.
                    matchState = MatchState.WAITING_HERO_ROLL;
                } else {
                    gameState.setPendingHeroCard(null);
                    matchState = MatchState.GAMEPLAY;
                }
                JSONObject matchUpdate = new JSONObject();
                matchUpdate.put("type", "match");
                matchUpdate.put("subtype", "match_state");
                matchUpdate.put("payload", getMatchState());
                broadcast(matchUpdate.toString());
                break;

            case "select_effect_target":
                Long targetCardId = json.getJSONObject("payload").getLong("card_id");
                String targetPlayerId = json.getJSONObject("payload").getString("player_id");
                if (gameState.getPendingHeroCard() != null) {
                    HeroCard heroCard = (HeroCard) gameState.getPendingHeroCard();
                    Map<String, List<Long>> targetMap = heroCard.addTarget(targetCardId, targetPlayerId);
                    JSONObject effectMsg = new JSONObject();
                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", matchState == MatchState.SELECTING_HAND_CARDS ? "select_hand_target" : "select_effect_target");
                    effectMsg.put("payload", new JSONObject()
                            .put("target",targetMap)
                            .put("maxTargets", heroCard.getMaxDestroy()));

                    broadcast(effectMsg.toString());
                }
                break;


            case "deselect_effect_target":
                Long deselectCardId = json.getJSONObject("payload").getLong("card_id");
                String deselectPlayerId = json.getJSONObject("payload").getString("player_id");
                if (gameState.getPendingHeroCard() != null) {
                    HeroCard heroCard = (HeroCard) gameState.getPendingHeroCard();
                    Map<String, List<Long>> targetMap  = heroCard.removeTarget(deselectCardId, deselectPlayerId);

                    JSONObject effectMsg = new JSONObject();
                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", matchState == MatchState.SELECTING_HAND_CARDS ? "select_hand_target" : "select_effect_target");
                    effectMsg.put("payload", new JSONObject().put("target",targetMap).put("maxTargets", heroCard.getMaxDestroy()));
                    broadcast(effectMsg.toString());
                }
                break;

            case "select_effect_player":
                String selectPlayerId = json.getString("targetPlayerId");
                if (gameState.getPendingHeroCard() != null) {
                    HeroCard heroCard = (HeroCard) gameState.getPendingHeroCard();
                    String targetedPlayer = heroCard.addTargetPlayer(selectPlayerId);
                    JSONObject effectMsg = new JSONObject();
                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", "select_player_target");
                    effectMsg.put("payload", new JSONObject().put("target", targetedPlayer).put("maxTargets", 1));
                    broadcast(effectMsg.toString());
                }
                break;
            case "deselect_effect_player":
                String deselectTargetPlayerId = json.getString("targetPlayerId");
                if (gameState.getPendingHeroCard() != null) {
                    HeroCard heroCard = (HeroCard) gameState.getPendingHeroCard();
                    String targetedPlayer = heroCard.removeTargetPlayer(deselectTargetPlayerId);
                    JSONObject effectMsg = new JSONObject();
                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", "select_player_target");
                    effectMsg.put("payload", new JSONObject().put("target", targetedPlayer).put("maxTargets", 1));
                    broadcast(effectMsg.toString());
                }
                break;
            default:
                System.out.println("Unknown action: " + action);
                break;
        }

        if(gameState.getCurrentAP() == 0 && !forbiddenTurnChange.contains(matchState)){

            JSONObject endTurn = new JSONObject();
            endTurn.put("type", "animation");
            endTurn.put("subtype", "end_turn");
            broadcast(endTurn.toString());
            gameState.clearEndOfTurnStatuses();
            currentPlayerTurnIndex = (currentPlayerTurnIndex + 1) % turnOrder.size();
            GameState nextPlayerState = players.get(turnOrder.get(currentPlayerTurnIndex));
            nextPlayerState.clearStartOfTurnStatuses();
            nextPlayerState.setCurrentAP(nextPlayerState.getMaxAP() + nextPlayerState.getPermanentExtraActionPoints());
            gameState.getUsedCardIds().clear();
        }



        JSONObject drawResponse = new JSONObject();
        drawResponse.put("type", "match");
        drawResponse.put("subtype", "match_state");
        drawResponse.put("payload", getMatchState());
        gameState.setLastRoll(0);
        broadcast(drawResponse.toString());




    }

    @JsonIgnore
    public Map<String, List<Long>> getSelectedTargets() {
        Card pendingHero = players.get(turnOrder.get(currentPlayerTurnIndex)).getPendingHeroCard();
        if (pendingHero != null && pendingHero.getType() == CardType.HERO) {
            HeroCard heroCard = (HeroCard) pendingHero;
            CompositeCardEffect effect = heroCard.getEffect();
            if (effect != null) {
                for (CardEffect subEffect : effect.getEffects()) {
                    if (subEffect instanceof DestroyCardEffect) {
                        return ((DestroyCardEffect) subEffect).getPlayerIdToCardId();
                    }

                    if(subEffect instanceof StealHandEffect){
                        return ((StealHandEffect) subEffect).getPlayerIdToCardId();
                    }

                    if (subEffect instanceof StealCardEffect) {
                        return ((StealCardEffect) subEffect).getPlayerIdToCardId();
                    }

                    if (subEffect instanceof StealHandWithBonusIfTypeEffect) {
                        return ((StealHandWithBonusIfTypeEffect) subEffect).getPrimary().getPlayerIdToCardId();
                    }

                    if (subEffect instanceof SwapSelfForStolenHeroEffect) {
                        return ((SwapSelfForStolenHeroEffect) subEffect).getPrimary().getPlayerIdToCardId();
                    }

                    if (subEffect instanceof StealAndUseEffectImmediatelyEffect) {
                        return ((StealAndUseEffectImmediatelyEffect) subEffect).getPrimary().getPlayerIdToCardId();
                    }

                }
            }
        }
        return Collections.emptyMap();
    }

    public synchronized void processOrderSelectionRoll(String playerId, int roll) {
        GameState playerState = players.get(playerId);
        if (playerState != null && playerState.getOrderRoll() == null) {
            playerState.setOrderRoll(roll);
            System.out.println("Player " + playerState.getUsername() + " rolled: " + roll);
            checkAndFinalizeOrder();
        }

        JSONObject rollResponse = new JSONObject();
        rollResponse.put("type", "match");
        rollResponse.put("subtype", "match_state");
        rollResponse.put("payload", getMatchState());
        broadcast(rollResponse.toString());
    }

    public void useCard(GameState gameState, Long cardId) {
        Optional<Card> cardOpt = gameState.getParty().stream().filter(c -> c.getCardId().equals(cardId)).findFirst();
        if (cardOpt.isEmpty()) return;
        Card card = cardOpt.get();
        if(card.getType() != CardType.HERO) return;
        if (gameState.getUsedCardIds().contains(card.getCardId())) return;
        gameState.setPendingHeroCard(card);
        matchState = MatchState.WAITING_HERO_ROLL;
    }

    private void checkAndFinalizeOrder() {
        boolean allPlayersRolled = players.values().stream().allMatch(p -> p.getOrderRoll() != null);
        if (!allPlayersRolled) {
            return;
        }
        Set<Integer> uniqueRolls = players.values().stream()
                .map(GameState::getOrderRoll)
                .collect(Collectors.toSet());

        if (uniqueRolls.size() < players.size()) {
            System.out.println("Tie detected! Requesting a re-roll.");
            JSONObject tieResponse = new JSONObject();
            players.values().forEach(GameState::resetOrderRoll);
            tieResponse.put("type", "match");
            tieResponse.put("subtype", "order_selection_tie");
            tieResponse.put("payload", getMatchState());
            broadcast(tieResponse.toString());
            return;

        }

        System.out.println("All players rolled without ties. Finalizing turn order.");
        this.turnOrder = players.entrySet().stream()
                .sorted(Map.Entry.comparingByValue(Comparator.comparingInt(GameState::getOrderRoll).reversed()))
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());


        System.out.println("Final turn order determined:");
        int i = 1;
        for (String playerId : turnOrder) {
            System.out.println(i++ + ". " + players.get(playerId).getUsername());
        }

        JSONObject orderFinalizedResponse = new JSONObject();
        matchState = MatchState.PARTY_LEADER_SELECTION;
        orderFinalizedResponse.put("type", "match");
        orderFinalizedResponse.put("subtype", "order_finalized");
        orderFinalizedResponse.put("payload", getMatchState());
        broadcast(orderFinalizedResponse.toString());
    }

    public void broadcast(String message) {
        MatchService.getInstance().publishToKafka(this.matchId, message);
    }



    public JSONObject getMatchState() {
        JSONObject playersJson = new JSONObject();
        for (Map.Entry<String, GameState> entry : players.entrySet()) {
            String playerId = entry.getKey();
            GameState player = entry.getValue();
            JSONObject playerJson = new JSONObject()
                    .put("leader", player.getLeader() == null ? "" : player.getLeader().toString())
                    .put("party", player.getParty())
                    .put("hand", player.getHand())
                    .put("lastRoll", player.getLastRoll())
                    .put("maxAP", player.getMaxAP())
                    .put("currentAP", player.getCurrentAP())
                    .put("username", player.getUsername())
                    .put("pendingHeroCard", player.getPendingHeroCard() == null ? JSONObject.NULL : new JSONObject(player.getPendingHeroCard()))
                    .put("usedCardIds", player.getUsedCardIds())
                    .put("orderRoll", player.getOrderRoll() == null ? JSONObject.NULL : player.getOrderRoll())
                    .put("rollBonusUntilEndOfTurn", player.getRollBonusUntilEndOfTurn())
                    .put("rollBonusSources", player.getRollBonusSources())
                    .put("permanentRollBonus", player.getPermanentRollBonus())
                    .put("permanentRollBonusSources", player.getPermanentRollBonusSources());
            playersJson.put(playerId, playerJson);
        }


        JSONArray monstersJson = new JSONArray();
        for (MonsterCard monster : monsterBoard) {
            monstersJson.put(new JSONObject()
                    .put("id", monster.getCardId())
                    .put("name", monster.getCardName())
                    .put("partyRequirement", monster.getPartyRequirementDescription())
                    .put("fightBackThreshold", monster.getFightBackThreshold())
                    .put("slayThreshold", monster.getSlayThreshold()));
        }

        return new JSONObject()
                .put("availablePartyLeaders", availablePartyLeaders)
                .put("currentPlayerTurn", turnOrder.isEmpty() ? "" : turnOrder.get(currentPlayerTurnIndex))
                .put("matchState", matchState.toString())
                .put ("challengeWindowTime", challengeWindowDuration)
                .put("challengerSet", new ArrayList<>(challengers))
                .put("players", playersJson)
                .put("monsters", monstersJson)
                .put("modifierWindowOpen", modifierWindowOpen)
                .put("modifierWindowLegalTargets", new ArrayList<>(modifierWindowLegalTargets))
                .put("pendingMonsterAttack", pendingMonsterId == null ? JSONObject.NULL : new JSONObject()
                        .put("monsterId", pendingMonsterId)
                        .put("playerId", pendingMonsterAttacker));
    }

    public synchronized boolean choosePartyLeader(String playerId, String leaderName) {

        System.out.println(turnOrder.get(currentPlayerTurnIndex) == playerId);
        if (!turnOrder.get(currentPlayerTurnIndex).equals(playerId)) return false;
        if (!availablePartyLeaders.contains(leaderName)) return false;
        GameState playerState = players.get(playerId);
        playerState.setLeader(PartyLeader.valueOf(leaderName));
        JSONObject playSound = new JSONObject();
        playSound.put("type", "sound");
        playSound.put("subtype", "play_class_sound");
        playSound.put("payload", leaderName);
        broadcast(playSound.toString());
        availablePartyLeaders.remove(leaderName);

        currentPlayerTurnIndex++;

        if (currentPlayerTurnIndex >= turnOrder.size()) {
            currentPlayerTurnIndex = 0;
            matchState = MatchState.GAMEPLAY;
            for (String player : turnOrder) {
                GameState gs = players.get(player);
                for (int i = 0; i < 5; i++) {
                    if (!drawPile.isEmpty()) {
                        gs.getHand().add(drawPile.pop());
                    }
                }
            }
        }
        JSONObject matchUpdate = new JSONObject();
        matchUpdate.put("type", "match");
        matchUpdate.put("subtype", "match_state");
        matchUpdate.put("payload", getMatchState());
        broadcast(matchUpdate.toString());
        return true;
    }

    public List<String> getAvailablePartyLeaders() {
        return Collections.unmodifiableList(availablePartyLeaders);
    }

    public void drawCard(GameState gameState) {

        JSONObject drawSound = new JSONObject();
        drawSound.put("type", "sound");
        drawSound.put("subtype", "play_draw_card_sound");
        broadcast(drawSound.toString());

        if (drawPile.isEmpty()) {
            reshuffleDiscardIntoDraw();
        }

        if (!drawPile.isEmpty()) {
            Card drawnCard = drawPile.pop();
            gameState.getHand().add(drawnCard);
            gameState.addLastDrawnCard(drawnCard);
            String drawerId = getPlayerId(gameState);
            if (drawerId != null) {
                eventBus.publishCardDrawn(drawerId, drawnCard);
            }
        }

    }

    /**
     * Reveals the top revealCount cards of the draw pile, keeps the first
     * keepCount of them in gameState's hand, and returns the rest to the top
     * of the draw pile - see ScryEffect.
     */
    public void scryTop(int revealCount, int keepCount, GameState gameState) {
        List<Card> revealed = new ArrayList<>();
        for (int i = 0; i < revealCount && !drawPile.isEmpty(); i++) {
            revealed.add(drawPile.pop());
        }
        int keep = Math.min(keepCount, revealed.size());
        for (int i = 0; i < keep; i++) {
            gameState.getHand().add(revealed.get(i));
        }
        for (int i = revealed.size() - 1; i >= keep; i--) {
            drawPile.push(revealed.get(i));
        }
    }

    /**
     * Plays a card right away, bypassing the challenge window - used for
     * "may play immediately" hero/monster effects. Heroes go straight to
     * party; Magic resolves its effect and goes to the discard pile.
     */
    public void playCardImmediately(GameState gameState, Card card) {
        if (!gameState.getHand().contains(card)) return;
        gameState.getHand().remove(card);

        if (card.getType() == CardType.HERO) {
            gameState.getParty().add(card);
        } else if (card.getType() == CardType.MAGIC) {
            card.getEffect().applyEffect(this, gameState);
            discardPile.add(card);
        } else {
            gameState.getParty().add(card);
        }
    }

    private void reshuffleDiscardIntoDraw() {
        Collections.shuffle(discardPile);
        drawPile.addAll(discardPile);
        discardPile.clear();
    }

    public void playCard(GameState gameState, Long cardId) {

        if (gameState.getCurrentAP() == 0) return;
        Optional<Card> cardOpt = gameState.getHand().stream().filter(c -> c.getCardId().equals(cardId)).findFirst();
        if (cardOpt.isEmpty()) return;
        Card card = cardOpt.get();
        challengeWindowRemainingTime = challengeWindowDuration;

        if(card.getType() == CardType.HERO){
            gameState.setPendingHeroCard(card);
            openChallengeWindow(players.entrySet().stream()
                    .filter(entry -> entry.getValue().equals(gameState))
                    .map(Map.Entry::getKey)
                    .findFirst()
                    .orElse(null) , card);
            return;
        }

        if (card.getType() == CardType.MAGIC) {
            gameState.clearLastDrawnCards();
            playCardImmediately(gameState, card);
            return;
        }

        // Modifier (and any other non-hero) cards can only be played through
        // handlePlayModifier during an open modifier window - never dropped
        // directly into the party like a hero.
    }

    private void openChallengeWindow(String playerId, Card heroCard) {
        challengeWindowOpen = true;
        currentHeroCard = heroCard;
        currentHeroPlayer = playerId;
        this.matchState = MatchState.CHALLENGE_WINDOW;
        challengers.clear();

        players.get(playerId).getHand().remove(heroCard);
        players.get(playerId).getParty().add(currentHeroCard);


        JSONObject challengeMsg = new JSONObject();
        challengeMsg.put("type", "match");
        challengeMsg.put("subtype", "challenge_window_open");
        broadcast(challengeMsg.toString());

        // Timer de 5 segundos
        challengeTimer = new Timer();
        challengeWindowStartTime = System.currentTimeMillis();
        challengeTimer.schedule(new TimerTask() {
            @Override
            public void run() {
                closeChallengeWindow();
            }
        }, challengeWindowRemainingTime);

        challengeTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                long remainingTime = getRemainingTime();
                if (remainingTime <= 0) {
                    cancel();
                } else {
                    JSONObject timeUpdateMsg = new JSONObject();
                    timeUpdateMsg.put("type", "match");
                    timeUpdateMsg.put("subtype", "timer_update");
                    timeUpdateMsg.put("payload", new JSONObject().put("remainingTime", remainingTime));
                    broadcast(timeUpdateMsg.toString());
                }
            }
        }, 0, 100);
    }

    private long getRemainingTime() {
        return challengeWindowRemainingTime - (System.currentTimeMillis() - challengeWindowStartTime);
    }

    public synchronized void challengeHero(String challengerId) {
        if (!challengeWindowOpen || challengerId.equals(currentHeroPlayer) || challengers.contains(challengerId)) return;
        challengers.add(challengerId);
        duelChallenger = challengerId;
        duelRolls.clear();
        challengeWindowRemainingTime -= (System.currentTimeMillis() - challengeWindowStartTime);
        challengeTimer.cancel();
        eventBus.publish(GameEventBus.EventType.PLAYER_CHALLENGED, currentHeroPlayer, challengerId);

        matchState = MatchState.CHALLENGE_ROLL;
        JSONObject duelMsg = new JSONObject();
        duelMsg.put("type", "match");
        duelMsg.put("subtype", "duel_start");
        duelMsg.put("payload", new JSONObject()
                .put("challenger", challengerId)
                .put("heroPlayer", currentHeroPlayer)
                .put("matchState", matchState.toString()));
        broadcast(duelMsg.toString());
    }

    /**
     * Opens a short window during which any player may play a Modifier card
     * (play_modifier action) targeting one of legalTargets' rolls, bypassing
     * the normal turn gate in performAction. onClose runs once the window
     * times out, with pendingModifierDelta populated for whoever got modified.
     */
    private void openModifierWindow(String context, Set<String> legalTargets, Runnable onClose) {
        modifierWindowOpen = true;
        modifierWindowContext = context;
        modifierWindowLegalTargets = legalTargets;
        pendingModifierDelta.clear();

        JSONObject openMsg = new JSONObject();
        openMsg.put("type", "match");
        openMsg.put("subtype", "modifier_window_open");
        openMsg.put("payload", new JSONObject()
                .put("context", context)
                .put("legalTargets", new JSONArray(legalTargets))
                .put("durationMs", MODIFIER_WINDOW_DURATION));
        broadcast(openMsg.toString());

        modifierWindowTimer = new Timer();
        modifierWindowTimer.schedule(new TimerTask() {
            @Override
            public void run() {
                closeModifierWindow(onClose);
            }
        }, MODIFIER_WINDOW_DURATION);
    }

    private void closeModifierWindow(Runnable onClose) {
        if (!modifierWindowOpen) return;
        modifierWindowOpen = false;
        modifierWindowContext = null;
        modifierWindowLegalTargets = Collections.emptySet();

        JSONObject closeMsg = new JSONObject();
        closeMsg.put("type", "match");
        closeMsg.put("subtype", "modifier_window_closed");
        broadcast(closeMsg.toString());

        onClose.run();
    }

    private int effectiveRollBonus(String realPlayerId) {
        GameState state = players.get(realPlayerId);
        int bonus = pendingModifierDelta.getOrDefault(realPlayerId, 0);
        if (state != null) {
            bonus += state.getRollBonusUntilEndOfTurn() + state.getPermanentRollBonus();
        }
        return bonus;
    }

    private void handlePlayModifier(String playerId, JSONObject json) {
        GameState caster = players.get(playerId);
        if (caster == null || !modifierWindowOpen) return;

        JSONObject payload = json.getJSONObject("payload");
        Long cardId = payload.getLong("card_id");
        int chosenValue = payload.getInt("chosen_value");
        String targetPlayerId = payload.getString("target_player_id");

        if (!modifierWindowLegalTargets.contains(targetPlayerId)) return;

        Optional<Card> cardOpt = caster.getHand().stream()
                .filter(c -> c.getCardId().equals(cardId) && c.getType() == CardType.MODIFIER)
                .findFirst();
        if (cardOpt.isEmpty()) return;

        ModifierCard modifierCard = (ModifierCard) cardOpt.get();
        if (!modifierCard.getPossibleValues().contains(chosenValue)) return;

        caster.getHand().remove(modifierCard);
        discardPile.add(modifierCard);
        pendingModifierDelta.merge(targetPlayerId, chosenValue, Integer::sum);

        eventBus.publish(GameEventBus.EventType.MODIFIER_PLAYED, playerId, targetPlayerId);

        JSONObject playedMsg = new JSONObject();
        playedMsg.put("type", "match");
        playedMsg.put("subtype", "modifier_played");
        playedMsg.put("payload", new JSONObject()
                .put("playerId", playerId)
                .put("targetPlayerId", targetPlayerId)
                .put("value", chosenValue));
        broadcast(playedMsg.toString());

        JSONObject stateMsg = new JSONObject();
        stateMsg.put("type", "match");
        stateMsg.put("subtype", "match_state");
        stateMsg.put("payload", getMatchState());
        broadcast(stateMsg.toString());
    }

    public synchronized void processMonsterRoll(String playerId, int roll) {
        if (matchState != MatchState.WAITING_MONSTER_ROLL || !playerId.equals(pendingMonsterAttacker)) return;

        JSONObject rollResponse = new JSONObject();
        rollResponse.put("type", "roll_result");
        rollResponse.put("subtype", "monster_roll");
        rollResponse.put("payload", new JSONObject().put("playerId", playerId).put("monsterId", pendingMonsterId).put("roll", roll));
        broadcast(rollResponse.toString());

        pendingMonsterRoll = roll;
        openModifierWindow("MONSTER_ROLL", Set.of(playerId), this::resolveMonsterAttack);
    }

    private void resolveMonsterAttack() {
        synchronized (this) {
            String attackerId = pendingMonsterAttacker;
            Long monsterId = pendingMonsterId;
            int roll = pendingMonsterRoll;
            GameState attacker = players.get(attackerId);

            pendingMonsterId = null;
            pendingMonsterAttacker = null;
            pendingMonsterRoll = null;
            matchState = MatchState.GAMEPLAY;

            if (attacker != null) {
                attacker.setCurrentAP(attacker.getCurrentAP() - 1);

                Optional<MonsterCard> monsterOpt = monsterBoard.stream().filter(m -> m.getCardId().equals(monsterId)).findFirst();
                if (monsterOpt.isPresent()) {
                    MonsterCard monster = monsterOpt.get();
                    int effectiveRoll = roll + effectiveRollBonus(attackerId);

                    JSONObject resultMsg = new JSONObject();
                    resultMsg.put("type", "animation");

                    if (effectiveRoll >= monster.getSlayThreshold()) {
                        monsterBoard.remove(monster);
                        monster.getReward().onSlain(this, attacker);
                        resultMsg.put("subtype", "monster_slain");
                        resultMsg.put("payload", new JSONObject().put("monsterId", monsterId).put("monsterName", monster.getCardName()).put("playerId", attackerId).put("roll", effectiveRoll));
                        broadcast(resultMsg.toString());
                    } else if (effectiveRoll <= monster.getFightBackThreshold()) {
                        monster.getFightBackPenalty().applyEffect(this, attacker);
                        resultMsg.put("subtype", "monster_fight_back");
                        resultMsg.put("payload", new JSONObject().put("monsterId", monsterId).put("monsterName", monster.getCardName()).put("playerId", attackerId).put("roll", effectiveRoll));
                        broadcast(resultMsg.toString());
                    } else {
                        resultMsg.put("subtype", "monster_survives");
                        resultMsg.put("payload", new JSONObject().put("monsterId", monsterId).put("monsterName", monster.getCardName()).put("playerId", attackerId).put("roll", effectiveRoll));
                        broadcast(resultMsg.toString());
                    }
                }

                if (attacker.getCurrentAP() == 0) {
                    JSONObject endTurn = new JSONObject();
                    endTurn.put("type", "animation");
                    endTurn.put("subtype", "end_turn");
                    broadcast(endTurn.toString());
                    attacker.clearEndOfTurnStatuses();
                    currentPlayerTurnIndex = (currentPlayerTurnIndex + 1) % turnOrder.size();
                    GameState nextPlayerState = players.get(turnOrder.get(currentPlayerTurnIndex));
                    nextPlayerState.clearStartOfTurnStatuses();
                    nextPlayerState.setCurrentAP(nextPlayerState.getMaxAP() + nextPlayerState.getPermanentExtraActionPoints());
                    attacker.getUsedCardIds().clear();
                }
            }

            JSONObject stateMsg = new JSONObject();
            stateMsg.put("type", "match");
            stateMsg.put("subtype", "match_state");
            stateMsg.put("payload", getMatchState());
            broadcast(stateMsg.toString());
        }
    }

    @JsonIgnore
    public List<MonsterCard> getMonsterBoard() {
        return Collections.unmodifiableList(monsterBoard);
    }

    private void closeChallengeWindow() {
        challengeWindowOpen = false;
        GameState heroState = players.get(currentHeroPlayer);
        if (currentHeroCard != null) {
            heroState.setPendingHeroCard(currentHeroCard);
            matchState = MatchState.WAITING_HERO_ROLL;
        }else{
            matchState = MatchState.GAMEPLAY;
        }

        currentHeroCard = null;
        currentHeroPlayer = null;
        challengers.clear();

        JSONObject challengeMsg = new JSONObject();
        challengeMsg.put("type", "match");
        challengeMsg.put("subtype", "match_state");
        challengeMsg.put("payload", getMatchState());
        broadcast(challengeMsg.toString());
        System.out.println("Mensagem enviada");
    }

    public boolean isSelectableHeroAvailable(GameState player) {
        for (GameState gameState : players.values()) {
            if(gameState == player) continue;
            for (Card card : gameState.getParty()) {
                if (card.getType() == CardType.HERO) {
                    return true;
                }
            }
        }
        return false;
    }

    public boolean isSelectableHandAvailable(GameState player) {
        for (GameState gameState : players.values()) {
            if(gameState == player) continue;
            if(!gameState.getHand().isEmpty()){
                return true;
            }
        }
        return false;
    }



    public void processHeroDiceRoll(GameState gameState, int diceValue) {
        Card pendingHero = gameState.getPendingHeroCard();
        gameState.setLastRoll(diceValue);
        int minValue = 0;
        if (pendingHero != null && pendingHero.getType() == CardType.HERO) {
            HeroCard card = (HeroCard) pendingHero;
            minValue = card.getDiceValue();
            int effectiveDiceValue = diceValue + gameState.getRollBonusUntilEndOfTurn() + gameState.getPermanentRollBonus();
            JSONObject rollResponse = new JSONObject();
            rollResponse.put("type", "dice_roll");
            rollResponse.put("subtype", "hero_roll");
            rollResponse.put("diceRoll", diceValue);
            rollResponse.put("minValue", minValue);
            broadcast(rollResponse.toString());
            if (effectiveDiceValue >= minValue) {
                gameState.getUsedCardIds().add(card.getCardId());
                String rollerId = getPlayerId(gameState);
                if (rollerId != null) {
                    eventBus.publish(GameEventBus.EventType.HERO_EFFECT_SUCCEEDED, rollerId, card.getCardName());
                }

                DiscardForEffect discardFor = card.getDiscardForEffect();
                if (discardFor != null) {
                    discardFor.resolveDiscard(this, gameState);
                }

                if(card.checkForSelectablePartyEffect() && isSelectableHeroAvailable(gameState)){
                    gameState.setPendingHeroCard(card);
                    matchState = MatchState.SELECTING_CARDS;
                    gameState.getUsedCardIds().add(card.getCardId());
                    JSONObject effectMsg = new JSONObject();
                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", "match_state");
                    effectMsg.put("payload", getMatchState());
                    broadcast(effectMsg.toString());

                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", "select_effect_target");
                    effectMsg.put("payload", new JSONObject()
                            .put("maxTargets", card.getMaxDestroy())
                            .put("target", Collections.emptyMap()));
                    broadcast(effectMsg.toString());
                    return;
                }

                if(card.checkForSelectableHandEffect() && isSelectableHandAvailable(gameState)){
                    gameState.setPendingHeroCard(card);
                    matchState = MatchState.SELECTING_HAND_CARDS;
                    gameState.getUsedCardIds().add(card.getCardId());
                    JSONObject effectMsg = new JSONObject();
                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", "match_state");
                    effectMsg.put("payload", getMatchState());
                    broadcast(effectMsg.toString());

                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", "select_effect_target");
                    effectMsg.put("payload", new JSONObject()
                            .put("maxTargets", card.getMaxDestroy())
                            .put("target", Collections.emptyMap()));
                    broadcast(effectMsg.toString());
                    return;
                }

                if(card.checkForSelectablePlayerEffect()){
                    gameState.setPendingHeroCard(card);
                    matchState =  MatchState.SELECTING_PLAYER;
                    gameState.getUsedCardIds().add(card.getCardId());
                    JSONObject effectMsg = new JSONObject();
                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", "match_state");
                    effectMsg.put("payload", getMatchState());
                    broadcast(effectMsg.toString());

                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", "select_player_target");
                    effectMsg.put("payload", new JSONObject()
                            .put("target", JSONObject.NULL)
                            .put("maxTargets", 1));
                    broadcast(effectMsg.toString());
                    return;
                }

                if(!card.checkForSelectablePartyEffect() && !card.checkForSelectableHandEffect()) {
                    gameState.clearLastDrawnCards();
                    ((HeroCard) pendingHero).applyEffect(this, gameState);
                }
            }
            gameState.getUsedCardIds().add(card.getCardId());
            gameState.setPendingHeroCard(null);

        }

        matchState = MatchState.GAMEPLAY;



    }

    public synchronized void processDuelRoll(String playerId, int roll) {
        duelRolls.put(playerId, roll);
        JSONObject rollResponse = new JSONObject();
        rollResponse.put("type", "roll_result");
        rollResponse.put("subtype", "duel_roll");
        rollResponse.put("payload", duelRolls);
        broadcast(rollResponse.toString());

        if (duelRolls.size() == 2) {
            String heroPlayerId = turnOrder.get(currentPlayerTurnIndex);
            openModifierWindow("DUEL", Set.of(heroPlayerId, duelChallenger), this::resolveDuelRoll);
        }
    }

    private void resolveDuelRoll() {
        synchronized (this) {
            int heroRoll = duelRolls.get(turnOrder.get(currentPlayerTurnIndex)) + effectiveRollBonus(turnOrder.get(currentPlayerTurnIndex));
            int challengerRoll = duelRolls.get(duelChallenger) + effectiveRollBonus(duelChallenger);

            JSONObject resultMsg = new JSONObject();
            resultMsg.put("type", "match");
            resultMsg.put("subtype", "duel_result");

            if (heroRoll >= challengerRoll) {
                resultMsg.put("winner", turnOrder.get(currentPlayerTurnIndex));
                matchState = MatchState.CHALLENGE_WINDOW;
                JSONObject matchUpdate = new JSONObject();
                matchUpdate.put("type", "match");
                matchUpdate.put("subtype", "match_state");
                matchUpdate.put("payload", getMatchState());
                broadcast(matchUpdate.toString());

                challengeTimer = new Timer();
                challengeWindowStartTime = System.currentTimeMillis();
                challengeTimer.schedule(new TimerTask() {
                    @Override
                    public void run() {
                        closeChallengeWindow();
                    }
                }, challengeWindowRemainingTime);
                challengeTimer.scheduleAtFixedRate(new TimerTask() {
                    @Override
                    public void run() {
                        long remainingTime = getRemainingTime();
                        if (remainingTime <= 0) {
                            cancel();
                        } else {
                            JSONObject timeUpdateMsg = new JSONObject();
                            timeUpdateMsg.put("type", "match");
                            timeUpdateMsg.put("subtype", "timer_update");
                            timeUpdateMsg.put("payload", new JSONObject().put("remainingTime", remainingTime));
                            broadcast(timeUpdateMsg.toString());
                        }
                    }
                }, 0, 100);
            } else {
                discardPile.add(currentHeroCard);
                GameState heroState = players.get(turnOrder.get(currentPlayerTurnIndex));
                heroState.getParty().remove(currentHeroCard);
                heroState.setPendingHeroCard(null);
                currentHeroCard = null;

                closeChallengeWindow();
                resultMsg.put("winner", duelChallenger);

            }
            resultMsg.put("Rolls", duelRolls);
            broadcast(resultMsg.toString());

            duelRolls.clear();
            duelChallenger = null;
        }

        }

        public Long getMatchId() {
            return matchId;
        }
    }




