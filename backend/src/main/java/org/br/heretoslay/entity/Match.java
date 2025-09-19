package org.br.heretoslay.entity;

import org.br.heretoslay.auth.AuthService;
import org.br.heretoslay.entity.Card.*;
import org.br.heretoslay.entity.Card.CardEffects.CompositeCardEffect;
import org.br.heretoslay.entity.Card.CardEffects.DestroyCardEffect;
import org.java_websocket.WebSocket;
import org.json.JSONObject;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;


public class Match {

    private final Map<WebSocket, GameState> players = new ConcurrentHashMap<>();
    private List<WebSocket> turnOrder = new ArrayList<>();
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
    private WebSocket currentHeroPlayer = null;
    private Set<WebSocket> challengers = new HashSet<>();
    private Timer challengeTimer = new Timer();
    private Map<WebSocket, Integer> duelRolls = new HashMap<>();
    private WebSocket duelChallenger = null;
    private long challengeWindowRemainingTime;
    private long challengeWindowStartTime;
    private long challengeWindowDuration = 10000;


    public Match(List<WebSocket> connections) {
        for (WebSocket conn : connections) {
            GameState gameState = new GameState(AuthService.getInstance().getPlayerByConnection(conn).getUsername(), AuthService.getInstance().getPlayerByConnection(conn).getId());
            players.put(conn, gameState);
        }
        matchState = MatchState.ORDER_SELECTION;
        drawPile = CardDeck.createDeck();

        Collections.shuffle(drawPile);
    }

    public Map<WebSocket, GameState> getPlayers() {
        return players;
    }

    public List<Card> getDiscardPile() {
        return discardPile;
    }

    public void performAction(WebSocket conn, String action, JSONObject json) {

        if (turnOrder.get(currentPlayerTurnIndex) != conn) return;
        GameState gameState = players.get(conn);

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
                pendingHero.getEffect().applyEffect(this, gameState);
                gameState.setPendingHeroCard(null);
                matchState = MatchState.GAMEPLAY;
                JSONObject matchUpdate = new JSONObject();
                matchUpdate.put("type", "match");
                matchUpdate.put("subtype", "match_state");
                matchUpdate.put("payload", getMatchState());
                broadcast(matchUpdate.toString());
                break;

            case "select_effect_target":
                Long targetCardId = json.getJSONObject("payload").getLong("card_id");
                String targetPlayerId = json.getJSONObject("payload").getString("player_id");
                if (gameState.getPendingHeroCard() != null && gameState.getPendingHeroCard().getType() == CardType.HERO) {
                    HeroCard heroCard = (HeroCard) gameState.getPendingHeroCard();
                    Map<String, List<Long>> targetMap = heroCard.addTarget(targetCardId, targetPlayerId);
                    JSONObject effectMsg = new JSONObject();
                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", "select_effect_target");
                    effectMsg.put("payload", new JSONObject()
                            .put("target",targetMap)
                            .put("maxTargets", heroCard.getMaxDestroy()));

                    broadcast(effectMsg.toString());
                }
                break;


            case "deselect_effect_target":
                Long deselectCardId = json.getJSONObject("payload").getLong("card_id");
                String deselectPlayerId = json.getJSONObject("payload").getString("player_id");
                if (gameState.getPendingHeroCard() != null && gameState.getPendingHeroCard().getType() == CardType.HERO) {
                    HeroCard heroCard = (HeroCard) gameState.getPendingHeroCard();
                    Map<String, List<Long>> targetMap  = heroCard.removeTarget(deselectCardId, deselectPlayerId);

                    JSONObject effectMsg = new JSONObject();
                    effectMsg.put("type", "match");
                    effectMsg.put("subtype", "select_effect_target");
                    effectMsg.put("payload", new JSONObject().put("target",targetMap).put("maxTargets", heroCard.getMaxDestroy()));
                    broadcast(effectMsg.toString());
                }
                break;
            default:
                System.out.println("Unknown action: " + action);
                break;
        }

        if(gameState.getCurrentAP() == 0 && matchState != MatchState.CHALLENGE_WINDOW && matchState != MatchState.CHALLENGE_ROLL && matchState != MatchState.SELECTING_CARDS){
            JSONObject endTurn = new JSONObject();
            endTurn.put("type", "animation");
            endTurn.put("subtype", "end_turn");
            broadcast(endTurn.toString());
            currentPlayerTurnIndex = (currentPlayerTurnIndex + 1) % turnOrder.size();
            gameState.setCurrentAP(gameState.getMaxAP());
            gameState.getUsedCardIds().clear();
        }



        JSONObject drawResponse = new JSONObject();
        drawResponse.put("type", "match");
        drawResponse.put("subtype", "match_state");
        drawResponse.put("payload", getMatchState());
        gameState.setLastRoll(0);
        broadcast(drawResponse.toString());




    }

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
                }
            }
        }
        return Collections.emptyMap();
    }

    public synchronized void processOrderSelectionRoll(WebSocket conn, int roll) {
        GameState playerState = players.get(conn);
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
        gameState.getUsedCardIds().add(cardId);
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
        for (WebSocket conn : turnOrder) {
            System.out.println(i++ + ". " + players.get(conn).getUsername());
        }

        JSONObject orderFinalizedResponse = new JSONObject();
        matchState = MatchState.PARTY_LEADER_SELECTION;
        orderFinalizedResponse.put("type", "match");
        orderFinalizedResponse.put("subtype", "order_finalized");
        orderFinalizedResponse.put("payload", getMatchState());
        broadcast(orderFinalizedResponse.toString());
    }

    public void broadcast(String message) {
        for (WebSocket conn : players.keySet()) {
            if (conn != null && conn.isOpen()) {
                conn.send(message);
            }
        }
    }



    public JSONObject getMatchState() {
        JSONObject playersJson = new JSONObject();
        for (Map.Entry<WebSocket, GameState> entry : players.entrySet()) {
            WebSocket conn = entry.getKey();
            GameState player = entry.getValue();
            JSONObject playerJson = new JSONObject()
                    .put("leader", player.getLeader() == null ? "" : player.getLeader().toString())
                    .put("party", player.getParty())
                    .put("hand", player.getHand())
                    .put("lastRoll", player.getLastRoll())
                    .put("maxAP", player.getMaxAP())
                    .put("currentAP", player.getCurrentAP())
                    .put("username", player.getUsername())
                    .put("pendingHeroCard", player.getPendingHeroCard() == null ? JSONObject.NULL : player.getPendingHeroCard())
                    .put("usedCardIds", player.getUsedCardIds())
                    .put("orderRoll", player.getOrderRoll() == null ? JSONObject.NULL : player.getOrderRoll());
            playersJson.put(AuthService.getInstance().getPlayerByConnection(conn).getId().toString(), playerJson);
        }


        return new JSONObject()
                .put("availablePartyLeaders", availablePartyLeaders)
                .put("currentPlayerTurn", turnOrder.isEmpty() ? "" : AuthService.getInstance().getPlayerByConnection(turnOrder.get(currentPlayerTurnIndex)).getId().toString())
                .put("matchState", matchState.toString())
                .put ("challengeWindowTime", challengeWindowDuration)
                .put("challengerSet", challengers.stream()
                        .map(conn -> AuthService.getInstance().getPlayerByConnection(conn).getId())
                        .collect(Collectors.toList()))
                .put("players", playersJson);
    }

    public synchronized boolean choosePartyLeader(WebSocket conn, String leaderName) {

        System.out.println(turnOrder.get(currentPlayerTurnIndex) == conn);
        if (turnOrder.get(currentPlayerTurnIndex) != conn) return false;
        if (!availablePartyLeaders.contains(leaderName)) return false;
        GameState playerState = players.get(conn);
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
            for (WebSocket playerConn : turnOrder) {
                GameState gs = players.get(playerConn);
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
        }

    }

    private void reshuffleDiscardIntoDraw() {
        Collections.shuffle(discardPile);
        drawPile.addAll(discardPile);
        discardPile.clear();
    }

    public boolean playCard(GameState gameState, Long cardId) {

        if (gameState.getCurrentAP() == 0) return false;
        Optional<Card> cardOpt = gameState.getHand().stream().filter(c -> c.getCardId().equals(cardId)).findFirst();
        if (cardOpt.isEmpty()) return false;
        Card card = cardOpt.get();
        challengeWindowRemainingTime = challengeWindowDuration;

        if(card.getType() == CardType.HERO){
            gameState.setPendingHeroCard(card);
            openChallengeWindow(players.entrySet().stream()
                    .filter(entry -> entry.getValue().equals(gameState))
                    .map(Map.Entry::getKey)
                    .findFirst()
                    .orElse(null) , card);
            return true;
        }

        //card.applyEffect(this, gameState);
        gameState.getHand().remove(card);
        gameState.getParty().add(card);
        return true;
    }

    private void openChallengeWindow(WebSocket heroPlayer, Card heroCard) {
        challengeWindowOpen = true;
        currentHeroCard = heroCard;
        currentHeroPlayer = heroPlayer;
        this.matchState = MatchState.CHALLENGE_WINDOW;
        challengers.clear();

        players.get(heroPlayer).getHand().remove(heroCard);
        players.get(heroPlayer).getParty().add(currentHeroCard);


        // Notifica o front-end para mostrar o botão de desafio
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

    public synchronized void challengeHero(WebSocket challenger) {
        if (!challengeWindowOpen || challenger == currentHeroPlayer || challengers.contains(challenger)) return;
        challengers.add(challenger);
        duelChallenger = challenger;
        duelRolls.clear();
        challengeWindowRemainingTime -= (System.currentTimeMillis() - challengeWindowStartTime);
        challengeTimer.cancel();

        matchState = MatchState.CHALLENGE_ROLL;
        JSONObject duelMsg = new JSONObject();
        duelMsg.put("type", "match");
        duelMsg.put("subtype", "duel_start");
        duelMsg.put("payload", new JSONObject()
                .put("challenger", AuthService.getInstance().getPlayerByConnection(challenger).getId())
                .put("heroPlayer", AuthService.getInstance().getPlayerByConnection(currentHeroPlayer).getId())
                .put("matchState", matchState.toString()));
        broadcast(duelMsg.toString());
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



    public void processHeroDiceRoll(GameState gameState, int diceValue) {
        Card pendingHero = gameState.getPendingHeroCard();
        gameState.setLastRoll(diceValue);
        int minValue = 0;
        if (pendingHero != null && pendingHero.getType() == CardType.HERO) {
            HeroCard card = (HeroCard) pendingHero;
            minValue = card.getDiceValue();
            JSONObject rollResponse = new JSONObject();
            rollResponse.put("type", "dice_roll");
            rollResponse.put("subtype", "hero_roll");
            rollResponse.put("diceRoll", diceValue);
            rollResponse.put("minValue", minValue);
            broadcast(rollResponse.toString());
            if (diceValue >= minValue) {
                if(card.checkForSelectableEffect() && isSelectableHeroAvailable(gameState)){
                    gameState.setPendingHeroCard(card);
                    matchState = MatchState.SELECTING_CARDS;
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

                if(!card.checkForSelectableEffect()) {
                    ((HeroCard) pendingHero).applyEffect(this, gameState);
                }
            }
            gameState.setPendingHeroCard(null);
        }

        matchState = MatchState.GAMEPLAY;



    }

    public synchronized void processDuelRoll(WebSocket player, int roll) {
        duelRolls.put(player, roll);
        JSONObject rollResponse = new JSONObject();
        rollResponse.put("type", "roll_result");
        rollResponse.put("subtype", "duel_roll");
        rollResponse.put("payload", duelRolls.entrySet().stream()
                .collect(Collectors.toMap(
                        entry -> AuthService.getInstance().getPlayerByConnection(entry.getKey()).getId().toString(),
                        Map.Entry::getValue
                )));
        broadcast(rollResponse.toString());

        if (duelRolls.size() == 2) {
            int heroRoll = duelRolls.get(turnOrder.get(currentPlayerTurnIndex));
            int challengerRoll = duelRolls.get(duelChallenger);

            JSONObject resultMsg = new JSONObject();
            resultMsg.put("type", "match");
            resultMsg.put("subtype", "duel_result");

            if (heroRoll >= challengerRoll) {
                resultMsg.put("winner", AuthService.getInstance().getPlayerByConnection(turnOrder.get(currentPlayerTurnIndex)).getId());
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
                resultMsg.put("winner", AuthService.getInstance().getPlayerByConnection(duelChallenger).getId());

            }
            resultMsg.put("Rolls", duelRolls);
            broadcast(resultMsg.toString());

            duelRolls.clear();
            duelChallenger = null;
        }

        }
    }




