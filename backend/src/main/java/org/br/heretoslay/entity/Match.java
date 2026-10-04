package org.br.heretoslay.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import org.br.heretoslay.engine.CardCatalog;
import org.br.heretoslay.engine.Choice;
import org.br.heretoslay.engine.Ctx;
import org.br.heretoslay.engine.GameCard;
import org.br.heretoslay.engine.HeroClass;
import org.br.heretoslay.engine.Monster;
import org.br.heretoslay.engine.MonsterCatalog;
import org.br.heretoslay.engine.PlayerState;
import org.br.heretoslay.engine.Roll;
import org.br.heretoslay.engine.Table;
import org.br.heretoslay.match.MatchService;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Timer;
import java.util.TimerTask;
import java.util.function.Consumer;

/**
 * One match of Here to Slay. Every action and card effect becomes a sequence of
 * steps; choices, challenge windows and rolls pause the sequence until the right
 * player answers. The turn only passes once nothing is pending.
 */
public class Match implements Table {

    public enum Phase { LOADING, ORDER_SELECTION, PARTY_LEADER_SELECTION, GAMEPLAY, FINISHED }

    private static final long CHOICE_MS = 60_000;
    private static final long CHALLENGE_WINDOW_MS = 8_000;
    private static final long MODIFIER_WINDOW_MS = 15_000;
    private static final long MODIFIER_EXTEND_MS = 5_000;
    /** Choices whose picked cards are secret (face-down, the top of the deck, a private hand): others only learn how many. */
    private static final Set<String> SECRET_PROMPTS = Set.of("pull_card", "keep_from_top", "top_order", "give_card", "take_from_hand");
    private static final long ROLL_WAIT_MS = 25_000;
    private static final int STARTING_HAND = 5;
    private static final int REDRAW_HAND = 5;
    private static final int MONSTERS_FACE_UP = 3;
    private static final int MONSTERS_TO_WIN = 3;
    private static final int CLASSES_TO_WIN = 6;
    private static final int LOG_LIMIT = 80;
    /** How long the match waits for everyone to open it before starting without the missing players. */
    private static final long LOADING_MS = 30_000;
    /** Initiative rolls itself for whoever has not rolled. */
    private static final long ORDER_ROLL_MS = 10_000;
    /** A Party Leader is drawn at random for whoever has not picked. */
    private static final long LEADER_PICK_MS = 20_000;
    /** How long a dropped player has to come back before leaving the match. */
    private static final long DISCONNECT_GRACE_MS = 60_000;

    private final Long matchId;
    private final Map<String, PlayerState> players = new LinkedHashMap<>();
    private final List<String> pickOrder = new ArrayList<>();
    private final List<String> turnOrder = new ArrayList<>();
    private final List<String> availableLeaders = new ArrayList<>();
    private Phase phase = Phase.LOADING;
    private final Set<String> loaded = new HashSet<>();
    private final Map<String, Long> disconnectedUntil = new LinkedHashMap<>();
    private long setupToken;
    private long setupDeadline;
    private int leaderPickIndex;
    private int turnIndex;
    private int round;
    private long startedAt;

    private final Deque<GameCard> drawPile;
    private final List<GameCard> discardPile = new ArrayList<>();
    private final List<Monster> monsterDeck;
    private final List<Monster> monsterBoard = new ArrayList<>();

    private final Deque<Runnable> flow = new ArrayDeque<>();
    private boolean waiting;
    private boolean pumping;

    private Choice choice;
    private ChallengeWindow challengeWindow;
    private Duel duel;
    private Roll roll;
    private ModifierWindow modifierWindow;
    private JSONObject recent;
    private int recentSeq;

    private final List<JSONObject> log = new ArrayList<>();
    private String winnerId;
    private String winReason;

    private final Timer timer = new Timer(true);
    private long timerToken;
    private int idSeq;
    private final ChatLog chat = new ChatLog();
    private final Output output;

    /** Where match messages go; MatchService in production. */
    public interface Output {
        void toAll(Long matchId, String message);

        void toPlayers(Long matchId, List<String> playerIds, String message);

        /** Who is still playing changed (someone left, or the match ended). */
        default void rosterChanged(Match match) { }
    }

    /** A Hero, Item or Magic card on its way to the table. */
    private static final class Play {
        final String ownerId;
        final GameCard card;
        String equipOwnerId;
        GameCard equipTarget;
        boolean blocked;

        Play(String ownerId, GameCard card) {
            this.ownerId = ownerId;
            this.card = card;
        }
    }

    private static final class ChallengeWindow {
        final Play play;
        final Set<String> eligible;
        final Set<String> passed = new HashSet<>();
        long deadline;

        ChallengeWindow(Play play, Set<String> eligible) {
            this.play = play;
            this.eligible = eligible;
        }
    }

    private static final class Duel {
        final Play play;
        final String challengerId;
        final Roll ownerRoll;
        final Roll challengerRoll;
        String winnerId;

        Duel(Play play, String challengerId, Roll ownerRoll, Roll challengerRoll) {
            this.play = play;
            this.challengerId = challengerId;
            this.ownerRoll = ownerRoll;
            this.challengerRoll = challengerRoll;
        }
    }

    private static final class ModifierWindow {
        final List<Roll> rolls;
        final Runnable onClose;
        final Set<String> passed = new HashSet<>();
        long deadline;

        ModifierWindow(List<Roll> rolls, Runnable onClose) {
            this.rolls = rolls;
            this.onClose = onClose;
        }
    }

    public Match(Long matchId, List<Player> startingPlayers) {
        this(matchId, startingPlayers, new Output() {
            @Override
            public void toAll(Long id, String message) {
                MatchService.getInstance().publishToKafka(id, message);
            }

            @Override
            public void toPlayers(Long id, List<String> playerIds, String message) {
                MatchService.getInstance().publishToPlayers(id, playerIds, message);
            }

            @Override
            public void rosterChanged(Match match) {
                MatchService.getInstance().publishRoster(match);
            }
        });
    }

    public Match(Long matchId, List<Player> startingPlayers, Output output) {
        this.matchId = matchId;
        this.output = output;
        for (Player p : startingPlayers) {
            String id = p.getId().toString();
            players.put(id, new PlayerState(id, p.getUsername()));
        }
        for (HeroClass cls : HeroClass.values()) {
            // The Shadow Claw cannot be used in 2-player games.
            if (cls == HeroClass.THIEF && players.size() == 2) continue;
            availableLeaders.add(cls.name());
        }
        drawPile = CardCatalog.shuffledDeck();
        monsterDeck = MonsterCatalog.shuffledDeck();
        scheduleSetup(LOADING_MS, this::startWithoutMissingPlayers);
    }

    public Long getMatchId() { return matchId; }

    public synchronized boolean isFinished() { return phase == Phase.FINISHED; }

    /** Players who have not left the match. */
    public synchronized List<String> activePlayerIds() {
        return active().stream().map(PlayerState::getId).toList();
    }

    @JsonIgnore
    public Map<String, PlayerState> getPlayers() { return players; }

    // =====================================================================
    // Entry points (called by MatchService and timers)
    // =====================================================================

    public synchronized void processOrderSelectionRoll(String playerId, int ignoredClientRoll) {
        rollInitiative(playerId);
        publishState();
    }

    public synchronized boolean choosePartyLeader(String playerId, String leader) {
        boolean picked = pickLeader(playerId, leader);
        publishState();
        return picked;
    }

    /** The player opened the match screen. Once everyone has, the initiative roll begins. */
    public synchronized void markLoaded(String playerId) {
        markSeen(playerId);
        PlayerState p = players.get(playerId);
        if (p == null || p.isGone()) return;
        loaded.add(playerId);
        if (phase == Phase.LOADING && active().stream().allMatch(x -> loaded.contains(x.getId()))) beginOrderSelection();
    }

    /** Any message from the player: if they had dropped, they are back in time. */
    public synchronized void markSeen(String playerId) {
        if (disconnectedUntil.remove(playerId) == null) return;
        broadcast(event("player_reconnected", new JSONObject().put("playerId", playerId)));
        publishState();
    }

    /** The gateway lost the player's connection: they have a grace period to come back. */
    public synchronized void markDisconnected(String playerId) {
        PlayerState p = players.get(playerId);
        if (p == null || p.isGone() || phase == Phase.FINISHED) return;
        long until = System.currentTimeMillis() + DISCONNECT_GRACE_MS;
        disconnectedUntil.put(playerId, until);
        broadcast(event("player_disconnected", new JSONObject().put("playerId", playerId).put("graceMs", DISCONNECT_GRACE_MS)));
        timer.schedule(new TimerTask() {
            @Override
            public void run() {
                synchronized (Match.this) {
                    Long current = disconnectedUntil.get(playerId);
                    if (current == null || current != until) return;
                    disconnectedUntil.remove(playerId);
                    removePlayer(playerId, "disconnected");
                    publishState();
                }
            }
        }, DISCONNECT_GRACE_MS);
        publishState();
    }

    /** The player gives up: they leave the match right away and the others carry on. */
    public synchronized void surrender(String playerId) {
        removePlayer(playerId, "surrender");
        publishState();
    }

    public synchronized void challengeHero(String playerId) {
        try {
            challenge(playerId);
            pump();
        } catch (RuntimeException e) {
            e.printStackTrace();
        }
        publishState();
    }

    public synchronized void processDuelRoll(String playerId, int ignored) {
        performAction(playerId, "roll", new JSONObject());
    }

    public synchronized void processMonsterRoll(String playerId, int ignored) {
        performAction(playerId, "roll", new JSONObject());
    }

    public synchronized void performAction(String playerId, String action, JSONObject json) {
        if (phase != Phase.GAMEPLAY || !players.containsKey(playerId) || players.get(playerId).isGone()) return;
        JSONObject payload = json.optJSONObject("payload");
        if (payload == null) payload = new JSONObject();
        try {
            switch (action) {
                case "play_modifier" -> playModifier(playerId, payload);
                case "select_effect_target" -> answerChoice(playerId, payload);
                case "preview_choice" -> previewChoice(playerId, payload);
                case "roll" -> rollDice(playerId);
                case "pass" -> pass(playerId);
                case "challenge" -> challenge(playerId);
                default -> turnAction(playerId, action, payload);
            }
            pump();
        } catch (RuntimeException e) {
            e.printStackTrace();
        }
        publishState();
    }

    public synchronized void handleChat(String playerId, String text) {
        PlayerState sender = players.get(playerId);
        if (sender == null) return;
        JSONObject message = chat.append(playerId, sender.getUsername(), text);
        if (message == null) return;
        broadcast(event("chat_message", message));
    }

    public synchronized void publishChatHistory() {
        broadcast(new JSONObject().put("type", "match").put("subtype", "chat_history").put("payload", chat.history()).toString());
    }

    /** Sends every player their own view of the match. */
    public synchronized void publishState() {
        long now = System.currentTimeMillis();
        for (String viewer : players.keySet()) {
            JSONObject message = new JSONObject().put("type", "match").put("subtype", "match_state").put("payload", stateFor(viewer, now));
            output.toPlayers(matchId, List.of(viewer), message.toString());
        }
    }

    // =====================================================================
    // Setup
    // =====================================================================

    /** Players still in the match. */
    private List<PlayerState> active() {
        return players.values().stream().filter(p -> !p.isGone()).toList();
    }

    /** Timers for the setup phases: only the latest one counts. */
    private void scheduleSetup(long delayMs, Runnable task) {
        long token = ++setupToken;
        setupDeadline = System.currentTimeMillis() + delayMs;
        timer.schedule(new TimerTask() {
            @Override
            public void run() {
                synchronized (Match.this) {
                    if (token != setupToken || phase == Phase.FINISHED || phase == Phase.GAMEPLAY) return;
                    try {
                        task.run();
                    } catch (RuntimeException e) {
                        e.printStackTrace();
                    }
                    publishState();
                }
            }
        }, delayMs);
    }

    private void startWithoutMissingPlayers() {
        if (phase != Phase.LOADING) return;
        for (PlayerState p : new ArrayList<>(active())) {
            if (!loaded.contains(p.getId())) removePlayer(p.getId(), "no_show");
        }
        if (phase == Phase.LOADING) beginOrderSelection();
    }

    private void beginOrderSelection() {
        phase = Phase.ORDER_SELECTION;
        scheduleSetup(ORDER_ROLL_MS, this::rollForEveryoneMissing);
    }

    private void rollForEveryoneMissing() {
        if (phase != Phase.ORDER_SELECTION) return;
        for (PlayerState p : new ArrayList<>(active())) {
            if (phase == Phase.ORDER_SELECTION && p.getOrderRoll() == null) rollInitiative(p.getId());
        }
    }

    private void rollInitiative(String playerId) {
        PlayerState p = players.get(playerId);
        if (phase != Phase.ORDER_SELECTION || p == null || p.isGone() || p.getOrderRoll() != null) return;
        int[] dice = Roll.throwDice();
        p.setOrderRoll(dice[0] + dice[1], dice);
        if (active().stream().allMatch(x -> x.getOrderRoll() != null)) finishOrderSelection();
    }

    private boolean pickLeader(String playerId, String leader) {
        if (phase != Phase.PARTY_LEADER_SELECTION || leaderPickIndex >= pickOrder.size()) return false;
        if (!playerId.equals(pickOrder.get(leaderPickIndex)) || !availableLeaders.contains(leader)) return false;
        players.get(playerId).setLeader(HeroClass.valueOf(leader));
        availableLeaders.remove(leader);
        log("leader_chosen", new JSONObject().put("actor", playerId).put("leader", leader));
        leaderPickIndex++;
        nextLeaderPick();
        return true;
    }

    /** Moves past players who left; starts the game after the last pick, else gives the next picker their time. */
    private void nextLeaderPick() {
        while (leaderPickIndex < pickOrder.size() && players.get(pickOrder.get(leaderPickIndex)).isGone()) leaderPickIndex++;
        if (leaderPickIndex >= pickOrder.size()) {
            startGame();
            return;
        }
        scheduleSetup(LEADER_PICK_MS, () -> {
            if (phase != Phase.PARTY_LEADER_SELECTION || availableLeaders.isEmpty()) return;
            String picker = pickOrder.get(leaderPickIndex);
            pickLeader(picker, availableLeaders.get(new java.security.SecureRandom().nextInt(availableLeaders.size())));
        });
    }

    private void finishOrderSelection() {
        List<PlayerState> rolled = active();
        Set<Integer> rolls = new HashSet<>();
        rolled.forEach(p -> rolls.add(p.getOrderRoll()));
        if (rolls.size() < rolled.size()) {
            JSONObject previous = new JSONObject();
            rolled.forEach(p -> previous.put(p.getId(), p.getOrderRoll()));
            rolled.forEach(p -> p.setOrderRoll(null, null));
            broadcast(event("order_selection_tie", new JSONObject().put("rolls", previous)));
            scheduleSetup(ORDER_ROLL_MS, this::rollForEveryoneMissing);
            return;
        }
        pickOrder.clear();
        rolled.stream()
                .sorted((a, b) -> Integer.compare(b.getOrderRoll(), a.getOrderRoll()))
                .forEach(p -> pickOrder.add(p.getId()));
        // Whoever picks their Party Leader last goes first; play continues in pick order.
        turnOrder.clear();
        turnOrder.add(pickOrder.get(pickOrder.size() - 1));
        for (int i = 0; i < pickOrder.size() - 1; i++) turnOrder.add(pickOrder.get(i));
        phase = Phase.PARTY_LEADER_SELECTION;
        leaderPickIndex = 0;
        broadcast(event("order_finalized", new JSONObject().put("turnOrder", new JSONArray(turnOrder))));
        nextLeaderPick();
    }

    private void startGame() {
        setupToken++;
        turnOrder.removeIf(id -> players.get(id).isGone());
        for (String id : turnOrder) {
            for (int i = 0; i < STARTING_HAND; i++) drawRaw(players.get(id));
        }
        while (monsterBoard.size() < MONSTERS_FACE_UP && !monsterDeck.isEmpty()) monsterBoard.add(monsterDeck.remove(0));
        phase = Phase.GAMEPLAY;
        startedAt = System.currentTimeMillis();
        turnIndex = 0;
        round = 1;
        current().onTurnStart();
        log("turn_start", new JSONObject().put("actor", current().getId()).put("round", round));
    }

    // =====================================================================
    // Flow
    // =====================================================================

    @Override
    public void push(List<Runnable> steps) {
        for (int i = steps.size() - 1; i >= 0; i--) flow.addFirst(steps.get(i));
    }

    private void pump() {
        if (pumping) return;
        pumping = true;
        try {
            while (!waiting && !flow.isEmpty() && phase == Phase.GAMEPLAY) flow.pollFirst().run();
        } finally {
            pumping = false;
        }
        if (!waiting && flow.isEmpty() && phase == Phase.GAMEPLAY && current().getActionPoints() <= 0) endTurn();
    }

    private void suspend() {
        waiting = true;
    }

    private void resume() {
        waiting = false;
        pump();
    }

    private boolean idle() {
        return !waiting && flow.isEmpty() && choice == null && challengeWindow == null && duel == null && roll == null;
    }

    private void schedule(long delayMs, Runnable task) {
        long token = ++timerToken;
        timer.schedule(new TimerTask() {
            @Override
            public void run() {
                synchronized (Match.this) {
                    if (token != timerToken || phase != Phase.GAMEPLAY) return;
                    try {
                        task.run();
                        pump();
                    } catch (RuntimeException e) {
                        e.printStackTrace();
                    }
                    publishState();
                }
            }
        }, delayMs);
    }

    private String newId() {
        return matchId + "-" + (++idSeq);
    }

    // =====================================================================
    // Turn actions
    // =====================================================================

    private PlayerState current() {
        return players.get(turnOrder.get(turnIndex));
    }

    private void turnAction(String playerId, String action, JSONObject payload) {
        PlayerState p = players.get(playerId);
        if (p != current() || !idle()) return;
        switch (action) {
            case "draw_card" -> {
                if (!spend(p, 1)) return;
                push(List.of(() -> draw(playerId, 1)));
            }
            case "play_card" -> {
                GameCard card = p.findInHand(payload.optLong("card_id", -1));
                if (card == null || !(card.is(GameCard.Kind.HERO) || card.is(GameCard.Kind.ITEM) || card.is(GameCard.Kind.MAGIC))) return;
                if (card.is(GameCard.Kind.ITEM) && equipTargets(playerId, card).isEmpty()) return;
                if (!spend(p, 1)) return;
                push(playSteps(playerId, card));
            }
            case "use_card" -> {
                GameCard hero = p.findInParty(payload.optLong("card_id", -1));
                if (hero == null || !hero.is(GameCard.Kind.HERO) || p.getUsedHeroes().contains(hero.getId())) return;
                if (hero.hasItemEffect(GameCard.ItemEffect.SEALING_KEY)) return;
                if (!spend(p, 1)) return;
                push(heroRollSteps(playerId, hero));
            }
            case "attempt_slay_monster" -> {
                long monsterId = payload.optLong("monster_id", -1);
                Monster monster = monsterBoard.stream().filter(m -> m.getId() == monsterId).findFirst().orElse(null);
                if (monster == null || !monster.meetsRequirement(p) || p.getActionPoints() < 2) return;
                spend(p, 2);
                push(attackSteps(playerId, monster));
            }
            case "redraw_hand" -> {
                if (!spend(p, 3)) return;
                push(List.of(() -> {
                    p.getHand().forEach(this::discard);
                    p.getHand().clear();
                    log("redrew", new JSONObject().put("actor", playerId));
                    draw(playerId, REDRAW_HAND);
                }));
            }
            case "leader_skill" -> {
                if (p.getLeader() != HeroClass.THIEF || p.isLeaderSkillUsed() || others(playerId).stream().allMatch(o -> o.getHand().isEmpty())) return;
                if (!spend(p, 1)) return;
                p.setLeaderSkillUsed(true);
                Ctx ctx = new Ctx(this, playerId, null);
                push(List.of(ctx.choosePlayer("target", o -> !o.getHand().isEmpty()), ctx.pull(ctx.varOf("target"), 1, "pulled")));
            }
            case "end_turn" -> endTurn();
            default -> System.out.println("Unknown action: " + action);
        }
    }

    private boolean spend(PlayerState p, int points) {
        if (p.getActionPoints() < points) return false;
        p.spend(points);
        return true;
    }

    private void endTurn() {
        PlayerState p = current();
        if (p.classes().size() >= CLASSES_TO_WIN) {
            finish(p.getId(), "classes");
            return;
        }
        p.onTurnEnd();
        advanceTurn();
        current().onTurnStart();
        broadcast(new JSONObject().put("type", "animation").put("subtype", "end_turn").toString());
        log("turn_start", new JSONObject().put("actor", current().getId()).put("round", round));
    }

    /** Next seat in turn order, skipping anyone who left the match. */
    private void advanceTurn() {
        for (int i = 0; i < turnOrder.size(); i++) {
            turnIndex = (turnIndex + 1) % turnOrder.size();
            if (turnIndex == 0) round++;
            if (!current().isGone()) return;
        }
    }

    /**
     * Takes a player out of the match (didn't load, dropped for too long, or surrendered). They stay
     * in the player list so effects already in motion never lose track of them, but turns, targets,
     * Challenges and Modifiers skip them, their cards go to the discard pile and whatever was waiting
     * on them resolves by itself. The last player standing wins.
     */
    private void removePlayer(String playerId, String reason) {
        PlayerState p = players.get(playerId);
        if (p == null || p.isGone() || phase == Phase.FINISHED) return;
        p.leave(reason);
        disconnectedUntil.remove(playerId);
        log("left", new JSONObject().put("actor", playerId).put("reason", reason));
        output.rosterChanged(this);
        broadcast(event("player_left", new JSONObject().put("playerId", playerId).put("reason", reason)));

        List<PlayerState> remaining = active();
        if (remaining.size() < 2) {
            // Before the game starts nobody wins by default; once it is on, the last one standing does.
            if (phase == Phase.LOADING || remaining.isEmpty()) finish(null, "not_enough_players");
            else finish(remaining.get(0).getId(), "last_standing");
            return;
        }
        switch (phase) {
            case LOADING -> {
                if (!remaining.isEmpty() && remaining.stream().allMatch(x -> loaded.contains(x.getId()))) beginOrderSelection();
            }
            case ORDER_SELECTION -> {
                if (remaining.stream().allMatch(x -> x.getOrderRoll() != null)) finishOrderSelection();
            }
            case PARTY_LEADER_SELECTION -> {
                if (leaderPickIndex < pickOrder.size() && pickOrder.get(leaderPickIndex).equals(playerId)) nextLeaderPick();
            }
            case GAMEPLAY -> leaveGameplay(p);
            default -> { }
        }
    }

    private void leaveGameplay(PlayerState p) {
        String playerId = p.getId();
        // Whatever was waiting on them resolves on its own.
        if (choice != null && choice.getChooserId().equals(playerId)) autoAnswer(choice);
        if (challengeWindow != null && challengeWindow.play.ownerId.equals(playerId)) {
            // A card they were playing never resolves.
            challengeWindow.play.blocked = true;
            challengeWindow = null;
            timerToken++;
            waiting = false;
        }
        if (challengeWindow != null && challengeWindow.eligible.contains(playerId)) pass(playerId);
        if (roll != null && roll.getRollerId().equals(playerId) && !roll.isRolled()) rollDice(playerId);
        if (duel != null) {
            if (duel.ownerRoll.getRollerId().equals(playerId) && !duel.ownerRoll.isRolled()) rollDice(playerId);
            if (duel != null && duel.challengerRoll.getRollerId().equals(playerId) && !duel.challengerRoll.isRolled()) rollDice(playerId);
        }
        // Their cards leave the table.
        new ArrayList<>(p.getHand()).forEach(this::discard);
        p.getHand().clear();
        for (GameCard hero : new ArrayList<>(p.getParty())) {
            p.getParty().remove(hero);
            discard(hero);
        }
        p.getSlain().clear();
        // Without their Modifiers the window may have nobody left to wait for.
        if (modifierWindow != null) closeModifierWindowIfAllPassed();
        // On their turn: no points left, so the turn passes as soon as nothing is pending.
        if (current() == p) p.spend(p.getActionPoints());
        pump();
    }

    private void autoAnswer(Choice c) {
        if (c.getOptions().stream().anyMatch(o -> "no".equals(o.optString("id")))) {
            answer(c, List.of("no"));
            return;
        }
        List<JSONObject> shuffled = new ArrayList<>(c.getOptions());
        Collections.shuffle(shuffled);
        answer(c, shuffled.subList(0, Math.max(c.getMin(), 0)).stream().map(o -> o.getString("id")).toList());
    }

    private void finish(String playerId, String reason) {
        phase = Phase.FINISHED;
        winnerId = playerId;
        winReason = reason;
        flow.clear();
        waiting = false;
        choice = null;
        challengeWindow = null;
        duel = null;
        roll = null;
        modifierWindow = null;
        timerToken++;
        setupToken++;
        if (playerId != null) log("won", new JSONObject().put("actor", playerId).put("reason", reason));
        broadcast(event("match_finished", new JSONObject().put("winner", playerId == null ? JSONObject.NULL : playerId).put("reason", reason)));
        output.rosterChanged(this);
    }

    // =====================================================================
    // Playing cards: declare, challenge, resolve
    // =====================================================================

    private List<Runnable> playSteps(String playerId, GameCard card) {
        Play play = new Play(playerId, card);
        List<Runnable> steps = new ArrayList<>();
        steps.add(() -> {
            PlayerState p = players.get(playerId);
            if (!p.getHand().remove(card)) {
                play.blocked = true;
                return;
            }
            log("played", new JSONObject().put("actor", playerId).put("cardName", card.getName()).put("cardType", card.getKind().name()));
        });
        if (card.is(GameCard.Kind.ITEM)) steps.add(() -> chooseEquipTarget(play));
        steps.add(() -> {
            if (!play.blocked) openChallengeWindow(play);
        });
        steps.add(() -> resolvePlay(play));
        return steps;
    }

    private List<JSONObject> equipTargets(String playerId, GameCard item) {
        List<JSONObject> options = new ArrayList<>();
        List<PlayerState> owners = item.isCursed() ? new ArrayList<>(players.values()) : List.of(players.get(playerId));
        for (PlayerState owner : owners) {
            for (GameCard hero : owner.heroes()) {
                if (hero.getItem() != null) continue;
                options.add(new JSONObject().put("id", String.valueOf(hero.getId())).put("ownerId", owner.getId()).put("card", hero.toJson()));
            }
        }
        return options;
    }

    private void chooseEquipTarget(Play play) {
        if (play.blocked) return;
        List<JSONObject> options = equipTargets(play.ownerId, play.card);
        if (options.isEmpty()) {
            players.get(play.ownerId).getHand().add(play.card);
            play.blocked = true;
            return;
        }
        ask(play.ownerId, "equip_target", new JSONObject().put("card", play.card.getName()), 1, 1, options, play.card, sel -> {
            JSONObject chosen = options.stream().filter(o -> o.getString("id").equals(sel.get(0))).findFirst().orElseThrow();
            play.equipOwnerId = chosen.getString("ownerId");
            play.equipTarget = players.get(play.equipOwnerId).findInParty(Long.parseLong(sel.get(0)));
        });
    }

    private boolean isChallengeable(Play play) {
        PlayerState owner = players.get(play.ownerId);
        if (owner.isUnchallengeableThisTurn()) return false;
        return !(play.card.is(GameCard.Kind.ITEM) && owner.has(Monster.Reward.WARWORN_OWLBEAR));
    }

    private void openChallengeWindow(Play play) {
        if (!isChallengeable(play)) return;
        Set<String> eligible = new HashSet<>();
        for (PlayerState other : others(play.ownerId)) {
            if (other.count(GameCard.Kind.CHALLENGE) > 0) eligible.add(other.getId());
        }
        if (eligible.isEmpty()) return;
        challengeWindow = new ChallengeWindow(play, eligible);
        challengeWindow.deadline = System.currentTimeMillis() + CHALLENGE_WINDOW_MS;
        suspend();
        schedule(CHALLENGE_WINDOW_MS, this::closeChallengeWindow);
    }

    private void closeChallengeWindow() {
        if (challengeWindow == null) return;
        challengeWindow = null;
        resume();
    }

    private void challenge(String challengerId) {
        ChallengeWindow window = challengeWindow;
        if (window == null || !window.eligible.contains(challengerId) || window.passed.contains(challengerId)) return;
        PlayerState challenger = players.get(challengerId);
        GameCard challengeCard = challenger.getHand().stream().filter(c -> c.is(GameCard.Kind.CHALLENGE)).findFirst().orElse(null);
        if (challengeCard == null) return;
        challenger.getHand().remove(challengeCard);
        discard(challengeCard);
        challengeWindow = null;
        timerToken++;
        Play play = window.play;
        log("challenged", new JSONObject().put("actor", challengerId).put("target", play.ownerId).put("cardName", play.card.getName()));
        broadcast(event("duel_start", new JSONObject().put("challenger", challengerId).put("heroPlayer", play.ownerId)));

        List<Runnable> steps = new ArrayList<>();
        if (players.get(play.ownerId).has(Monster.Reward.BLOODWING)) {
            steps.add(new Ctx(this, play.ownerId, null).discard(() -> challengerId, 1, false, "bloodwing"));
        }
        steps.add(() -> startDuel(play, challengerId));
        push(steps);
        waiting = false;
    }

    private void startDuel(Play play, String challengerId) {
        Roll ownerRoll = new Roll(newId(), Roll.Kind.CHALLENGE, play.ownerId, play.card, null);
        Roll challengerRoll = new Roll(newId(), Roll.Kind.CHALLENGE, challengerId, play.card, null);
        addRollBonuses(ownerRoll, false);
        addRollBonuses(challengerRoll, true);
        duel = new Duel(play, challengerId, ownerRoll, challengerRoll);
        suspend();
        schedule(ROLL_WAIT_MS, this::autoRollPending);
        // Someone who already left rolls at once, so the duel never waits on them.
        if (players.get(play.ownerId).isGone()) rollDice(play.ownerId);
        if (duel != null && players.get(challengerId).isGone()) rollDice(challengerId);
    }

    private void resolveDuel() {
        Duel d = duel;
        boolean challengerWins = d.challengerRoll.total() >= d.ownerRoll.total();
        d.winnerId = challengerWins ? d.challengerId : d.play.ownerId;
        d.play.blocked = challengerWins;
        log("challenge_result", new JSONObject()
                .put("actor", d.winnerId)
                .put("target", challengerWins ? d.play.ownerId : d.challengerId)
                .put("cardName", d.play.card.getName())
                .put("blocked", challengerWins)
                .put("value", d.ownerRoll.total())
                .put("value2", d.challengerRoll.total()));
        broadcast(new JSONObject().put("type", "match").put("subtype", "duel_result").put("winner", d.winnerId).toString());
        setRecent(new JSONObject().put("type", "duel").put("duel", duelJson(d)));
        duel = null;
        resume();
    }

    private void resolvePlay(Play play) {
        PlayerState owner = players.get(play.ownerId);
        GameCard card = play.card;
        if (play.blocked) {
            if (!owner.getHand().contains(card)) discard(card);
            return;
        }
        switch (card.getKind()) {
            case HERO -> {
                owner.getParty().add(card);
                log("hero_entered", new JSONObject().put("actor", play.ownerId).put("cardName", card.getName()));
                if (!card.hasItemEffect(GameCard.ItemEffect.SEALING_KEY)) {
                    confirm(play.ownerId, "confirm_roll_now", new JSONObject().put("card", card.getName()), card, yes -> {
                        if (yes) push(heroRollSteps(play.ownerId, card));
                    });
                }
            }
            case ITEM -> {
                PlayerState heroOwner = players.get(play.equipOwnerId);
                if (play.equipTarget != null && heroOwner.getParty().contains(play.equipTarget) && play.equipTarget.getItem() == null) {
                    play.equipTarget.setItem(card);
                    log("equipped", new JSONObject().put("actor", play.ownerId).put("target", play.equipOwnerId)
                            .put("cardName", card.getName()).put("heroName", play.equipTarget.getName()));
                } else {
                    owner.getHand().add(card);
                }
            }
            case MAGIC -> {
                Ctx ctx = new Ctx(this, play.ownerId, card);
                List<Runnable> steps = new ArrayList<>(card.getScript().steps(ctx));
                steps.add(() -> {
                    discard(card);
                    if (owner.getLeader() == HeroClass.WIZARD) draw(play.ownerId, 1);
                });
                push(steps);
            }
            default -> discard(card);
        }
    }

    // =====================================================================
    // Hero effect rolls
    // =====================================================================

    private List<Runnable> heroRollSteps(String playerId, GameCard hero) {
        return List.of(() -> {
            PlayerState p = players.get(playerId);
            if (!p.getParty().contains(hero) || hero.hasItemEffect(GameCard.ItemEffect.SEALING_KEY)) return;
            p.getUsedHeroes().add(hero.getId());
            Roll r = new Roll(newId(), Roll.Kind.HERO, playerId, hero, null);
            addRollBonuses(r, false);
            roll = r;
            suspend();
            schedule(ROLL_WAIT_MS, this::autoRollPending);
        });
    }

    private void resolveHeroRoll(Roll r) {
        GameCard hero = r.getCard();
        String playerId = r.getRollerId();
        PlayerState p = players.get(playerId);
        boolean success = r.total() >= hero.getDice();
        r.setOutcome(success ? "success" : "fail");
        log("hero_roll", new JSONObject().put("actor", playerId).put("cardName", hero.getName())
                .put("value", r.total()).put("target", hero.getDice()).put("success", success));
        broadcast(new JSONObject().put("type", "dice_roll").put("subtype", "hero_roll")
                .put("diceRoll", r.total()).put("minValue", hero.getDice()).put("playerId", playerId).toString());
        setRecent(new JSONObject().put("type", "roll").put("roll", r.toJson()));
        roll = null;

        List<Runnable> steps = new ArrayList<>();
        if (success) {
            steps.addAll(hero.getScript().steps(new Ctx(this, playerId, hero)));
            if (p.has(Monster.Reward.ARTIC_ARIES)) steps.add(() -> draw(playerId, 1));
            if (hero.hasItemEffect(GameCard.ItemEffect.SHINY_COIN)) {
                steps.add(new Ctx(this, playerId, hero.getItem()).discardOwn(1));
            }
        } else if (hero.hasItemEffect(GameCard.ItemEffect.RUSTY_COIN)) {
            steps.add(() -> draw(playerId, 1));
        }
        push(steps);
        resume();
    }

    // =====================================================================
    // Monster attacks
    // =====================================================================

    private List<Runnable> attackSteps(String playerId, Monster monster) {
        return List.of(() -> {
            Roll r = new Roll(newId(), Roll.Kind.ATTACK, playerId, null, monster);
            addRollBonuses(r, false);
            roll = r;
            log("attacked", new JSONObject().put("actor", playerId).put("cardName", monster.getName()));
            broadcast(new JSONObject().put("type", "animation").put("subtype", "monster_attack_start")
                    .put("payload", new JSONObject().put("monsterId", monster.getId()).put("playerId", playerId)).toString());
            suspend();
            schedule(ROLL_WAIT_MS, this::autoRollPending);
        });
    }

    private void resolveAttack(Roll r) {
        Monster monster = r.getMonster();
        String playerId = r.getRollerId();
        PlayerState p = players.get(playerId);
        int total = r.total();
        String subtype;
        List<Runnable> steps = new ArrayList<>();
        if (total >= monster.getSlay()) {
            subtype = "monster_slain";
            r.setOutcome("slain");
            monsterBoard.remove(monster);
            p.getSlain().add(monster);
            if (!monsterDeck.isEmpty()) monsterBoard.add(monsterDeck.remove(0));
        } else if (total <= monster.getFightBack()) {
            subtype = "monster_fight_back";
            r.setOutcome("fight_back");
            Ctx ctx = new Ctx(this, playerId, null);
            steps.add(monster.getPenalty() == Monster.Penalty.SACRIFICE_HERO
                    ? ctx.sacrificeBy(() -> playerId)
                    : ctx.discard(() -> playerId, 2, false, "penalty"));
        } else {
            subtype = "monster_survives";
            r.setOutcome("survives");
        }
        broadcast(new JSONObject().put("type", "animation").put("subtype", subtype).put("payload", new JSONObject()
                .put("monsterId", monster.getId()).put("monsterName", monster.getName()).put("playerId", playerId).put("roll", total)).toString());
        log("attack_result", new JSONObject().put("actor", playerId).put("cardName", monster.getName()).put("value", total).put("outcome", r.toJson().optString("outcome")));
        setRecent(new JSONObject().put("type", "roll").put("roll", r.toJson()));
        roll = null;
        if (p.getSlain().size() >= MONSTERS_TO_WIN) {
            finish(playerId, "monsters");
            return;
        }
        push(steps);
        resume();
    }

    // =====================================================================
    // Dice, bonuses and the Modifier window
    // =====================================================================

    private void addRollBonuses(Roll r, boolean asChallenger) {
        PlayerState p = players.get(r.getRollerId());
        switch (r.getKind()) {
            case HERO -> {
                if (p.getLeader() == HeroClass.BARD) r.addBonus("The Charismatic Song", 1);
                if (p.has(Monster.Reward.ANURAN_CAULDRON)) r.addBonus("Anuran Cauldron", 1);
                if (r.getCard().hasItemEffect(GameCard.ItemEffect.BIG_RING)) r.addBonus("Really Big Ring", 2);
                if (r.getCard().hasItemEffect(GameCard.ItemEffect.SNAKE_EYES)) r.addBonus("Curse of the Snake's Eyes", -2);
            }
            case ATTACK -> {
                if (p.getLeader() == HeroClass.RANGER) r.addBonus("The Divine Arrow", 1);
            }
            case CHALLENGE -> {
                if (asChallenger && p.getLeader() == HeroClass.FIGHTER) r.addBonus("The Fist of Reason", 2);
                if (p.has(Monster.Reward.TITAN_WYVERN)) r.addBonus("Titan Wyvern", 1);
            }
        }
        if (p.has(Monster.Reward.DARK_DRAGON_KING)) r.addBonus("Dark Dragon King", 1);
        // "Until the end of your turn" bonuses only count during your own turn.
        if (p == current() && p.getTurnRollBonus() != 0) r.addBonus(String.join(", ", p.getTurnBonusSources()), p.getTurnRollBonus());
    }

    private void rollDice(String playerId) {
        if (roll != null && roll.getRollerId().equals(playerId) && !roll.isRolled()) {
            roll.roll();
            Roll r = roll;
            openModifierWindow(List.of(r), () -> {
                if (r.getKind() == Roll.Kind.HERO) resolveHeroRoll(r);
                else resolveAttack(r);
            });
            return;
        }
        if (duel != null) {
            Roll r = duel.ownerRoll.getRollerId().equals(playerId) ? duel.ownerRoll
                    : duel.challengerRoll.getRollerId().equals(playerId) ? duel.challengerRoll : null;
            if (r == null || r.isRolled()) return;
            r.roll();
            if (duel.ownerRoll.isRolled() && duel.challengerRoll.isRolled()) {
                openModifierWindow(List.of(duel.ownerRoll, duel.challengerRoll), this::resolveDuel);
            }
        }
    }

    /** Players who don't click in time get rolled for. */
    private void autoRollPending() {
        if (roll != null && !roll.isRolled()) {
            rollDice(roll.getRollerId());
        } else if (duel != null) {
            if (!duel.ownerRoll.isRolled()) rollDice(duel.ownerRoll.getRollerId());
            if (duel != null && !duel.challengerRoll.isRolled()) rollDice(duel.challengerRoll.getRollerId());
        }
    }

    private Set<String> modifierHolders() {
        Set<String> holders = new HashSet<>();
        players.values().forEach(p -> {
            if (p.count(GameCard.Kind.MODIFIER) > 0) holders.add(p.getId());
        });
        return holders;
    }

    private void openModifierWindow(List<Roll> rolls, Runnable onClose) {
        timerToken++;
        if (modifierHolders().isEmpty()) {
            onClose.run();
            return;
        }
        modifierWindow = new ModifierWindow(rolls, onClose);
        modifierWindow.deadline = System.currentTimeMillis() + MODIFIER_WINDOW_MS;
        schedule(MODIFIER_WINDOW_MS, this::closeModifierWindow);
    }

    private void closeModifierWindow() {
        ModifierWindow window = modifierWindow;
        if (window == null) return;
        modifierWindow = null;
        timerToken++;
        window.onClose.run();
    }

    private void playModifier(String playerId, JSONObject payload) {
        ModifierWindow window = modifierWindow;
        if (window == null) return;
        PlayerState p = players.get(playerId);
        GameCard card = p.findInHand(payload.optLong("card_id", -1));
        int value = payload.optInt("chosen_value", 0);
        String targetId = payload.optString("target_player_id", "");
        if (card == null || !card.is(GameCard.Kind.MODIFIER) || !card.getModifierValues().contains(value)) return;
        Roll target = window.rolls.stream().filter(r -> r.getRollerId().equals(targetId)).findFirst().orElse(null);
        if (target == null) return;

        p.getHand().remove(card);
        discard(card);
        target.addModifier(playerId, value, card.getName());
        int guardian = payload.optInt("guardian_bonus", 0);
        if (p.getLeader() == HeroClass.GUARDIAN && (guardian == 1 || guardian == -1)) {
            target.addModifier(playerId, guardian, "The Protecting Horn");
        }
        if (!playerId.equals(targetId) && players.get(targetId).has(Monster.Reward.ABYSS_QUEEN)) target.addBonus("Abyss Queen", 1);
        log("modifier", new JSONObject().put("actor", playerId).put("target", targetId).put("value", value));
        broadcast(event("modifier_played", new JSONObject().put("playerId", playerId).put("targetPlayerId", targetId).put("value", value)));
        for (PlayerState holder : players.values()) {
            if (holder.has(Monster.Reward.CROWNED_SERPENT)) drawRaw(holder);
        }
        window.passed.remove(playerId);
        long now = System.currentTimeMillis();
        if (window.deadline - now < MODIFIER_EXTEND_MS) {
            window.deadline = now + MODIFIER_EXTEND_MS;
            schedule(MODIFIER_EXTEND_MS, this::closeModifierWindow);
        }
        closeModifierWindowIfAllPassed();
    }

    private void pass(String playerId) {
        if (challengeWindow != null && challengeWindow.eligible.contains(playerId)) {
            challengeWindow.passed.add(playerId);
            if (challengeWindow.passed.containsAll(challengeWindow.eligible)) {
                timerToken++;
                closeChallengeWindow();
            }
            return;
        }
        if (modifierWindow != null) {
            modifierWindow.passed.add(playerId);
            closeModifierWindowIfAllPassed();
        }
    }

    private void closeModifierWindowIfAllPassed() {
        if (modifierWindow != null && modifierWindow.passed.containsAll(modifierHolders())) closeModifierWindow();
    }

    // =====================================================================
    // Choices
    // =====================================================================

    @Override
    public void ask(String chooserId, String prompt, JSONObject params, int min, int max, List<JSONObject> options,
                    GameCard source, Consumer<List<String>> onAnswer) {
        // Every real decision is shown to the player, even a forced one, so they always see the cards involved.
        // "view_" and "notice_" prompts only show information and wait for an OK.
        boolean informative = prompt.startsWith("view_") || prompt.startsWith("notice_");
        if (!informative && (options.isEmpty() || max == 0)) {
            onAnswer.accept(List.of());
            return;
        }
        Choice c = new Choice(newId(), chooserId, prompt, params, min, max, options, source, onAnswer);
        if (players.get(chooserId) == null || players.get(chooserId).isGone()) {
            List<JSONObject> shuffled = new ArrayList<>(options);
            Collections.shuffle(shuffled);
            onAnswer.accept(shuffled.subList(0, Math.max(min, 0)).stream().map(o -> o.getString("id")).toList());
            return;
        }
        c.setDeadline(System.currentTimeMillis() + CHOICE_MS);
        choice = c;
        suspend();
        schedule(CHOICE_MS, () -> {
            if (choice == c) autoAnswer(c);
        });
    }

    @Override
    public void confirm(String chooserId, String prompt, JSONObject params, GameCard source, Consumer<Boolean> onAnswer) {
        if (players.get(chooserId) == null || players.get(chooserId).isGone()) {
            onAnswer.accept(false);
            return;
        }
        List<JSONObject> options = List.of(new JSONObject().put("id", "yes"), new JSONObject().put("id", "no"));
        Choice c = new Choice(newId(), chooserId, prompt, params, 1, 1, options, source, sel -> onAnswer.accept("yes".equals(sel.get(0))));
        c.setDeadline(System.currentTimeMillis() + CHOICE_MS);
        choice = c;
        suspend();
        schedule(CHOICE_MS, () -> {
            if (choice == c) answer(c, List.of("no"));
        });
    }

    /** The chooser's marks so far, so everyone watching sees the same screen move. */
    private void previewChoice(String playerId, JSONObject payload) {
        Choice c = choice;
        if (c == null || !c.getChooserId().equals(playerId)) return;
        if (!payload.optString("choice_id", c.getId()).equals(c.getId())) return;
        JSONArray raw = payload.optJSONArray("selection");
        List<String> selection = new ArrayList<>();
        if (raw != null) for (int i = 0; i < raw.length(); i++) selection.add(String.valueOf(raw.get(i)));
        c.setPreview(selection);
    }

    private void answerChoice(String playerId, JSONObject payload) {
        Choice c = choice;
        if (c == null || !c.getChooserId().equals(playerId)) return;
        if (!payload.optString("choice_id", c.getId()).equals(c.getId())) return;
        JSONArray raw = payload.optJSONArray("selection");
        List<String> selection = new ArrayList<>();
        if (raw != null) for (int i = 0; i < raw.length(); i++) selection.add(String.valueOf(raw.get(i)));
        if (!c.isValid(selection)) return;
        answer(c, selection);
    }

    private void answer(Choice c, List<String> selection) {
        announceChoice(c, selection);
        choice = null;
        timerToken++;
        // The answer may open a follow-up choice, which suspends the flow again.
        waiting = false;
        c.getOnAnswer().accept(selection);
        pump();
    }

    /** Tells the whole table what was chosen, keeping secret cards secret. */
    private void announceChoice(Choice c, List<String> selection) {
        String prompt = c.getPrompt();
        if (selection.isEmpty() || prompt.startsWith("view_") || prompt.startsWith("notice_")) return;
        if (selection.contains("yes") || selection.contains("no")) return;
        JSONObject payload = new JSONObject()
                .put("chooserId", c.getChooserId())
                .put("prompt", prompt)
                .put("card", c.getSource() == null ? "" : c.getSource().getName())
                .put("count", selection.size());
        if (c.getParams().has("target")) payload.put("target", c.getParams().get("target"));
        JSONArray picked = new JSONArray();
        if (!SECRET_PROMPTS.contains(prompt)) {
            for (JSONObject option : c.getOptions()) {
                if (!selection.contains(option.getString("id"))) continue;
                JSONObject entry = new JSONObject();
                if (option.has("username")) entry.put("playerId", option.getString("id"));
                if (option.has("card")) entry.put("cardName", option.getJSONObject("card").optString("cardName"));
                if (option.has("ownerId")) entry.put("ownerId", option.getString("ownerId"));
                picked.put(entry);
            }
        }
        payload.put("picked", picked);
        broadcast(event("choice_made", payload));
    }

    // =====================================================================
    // Table: what card effects can do
    // =====================================================================

    @Override
    public PlayerState player(String id) {
        return players.get(id);
    }

    @Override
    public List<PlayerState> others(String id) {
        List<PlayerState> result = new ArrayList<>();
        List<String> order = turnOrder.isEmpty() ? new ArrayList<>(players.keySet()) : turnOrder;
        int start = order.indexOf(id);
        for (int i = 1; i < order.size(); i++) {
            PlayerState other = players.get(order.get((start + i) % order.size()));
            if (!other.isGone()) result.add(other);
        }
        return result;
    }

    private GameCard drawRaw(PlayerState p) {
        if (drawPile.isEmpty() && !discardPile.isEmpty()) {
            List<GameCard> reshuffled = new ArrayList<>(discardPile);
            discardPile.clear();
            Collections.shuffle(reshuffled);
            reshuffled.forEach(drawPile::push);
            log("reshuffled", new JSONObject());
        }
        if (drawPile.isEmpty()) return null;
        GameCard card = drawPile.pop();
        p.getHand().add(card);
        return card;
    }

    @Override
    public List<GameCard> draw(String playerId, int count) {
        PlayerState p = players.get(playerId);
        List<GameCard> drawn = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            GameCard card = drawRaw(p);
            if (card == null) break;
            drawn.add(card);
        }
        if (drawn.isEmpty()) return drawn;
        log("drew", new JSONObject().put("actor", playerId).put("count", drawn.size()));
        broadcast(new JSONObject().put("type", "sound").put("subtype", "play_draw_card_sound").toString());

        List<Runnable> steps = new ArrayList<>();
        for (GameCard card : drawn) {
            if (card.is(GameCard.Kind.MODIFIER) && p.has(Monster.Reward.REX_MAJOR)) steps.add(() -> draw(playerId, 1));
            boolean playable = (card.is(GameCard.Kind.MAGIC) && p.has(Monster.Reward.ORTHUS))
                    || (card.is(GameCard.Kind.ITEM) && p.has(Monster.Reward.MALAMAMMOTH) && !equipTargets(playerId, card).isEmpty());
            if (playable) {
                steps.add(() -> {
                    if (!p.getHand().contains(card)) return;
                    confirm(playerId, "confirm_play", new JSONObject().put("target", card.getName()), card, yes -> {
                        if (yes) playFree(playerId, card);
                    });
                });
            }
        }
        push(steps);
        return drawn;
    }

    @Override
    public void discard(GameCard card) {
        if (card == null) return;
        if (card.getItem() != null) {
            discardPile.add(card.getItem());
            card.setItem(null);
        }
        discardPile.add(card);
    }

    @Override
    public List<GameCard> discardPile() {
        return discardPile;
    }

    @Override
    public List<GameCard> takeFromDeck(int count) {
        List<GameCard> taken = new ArrayList<>();
        for (int i = 0; i < count && !drawPile.isEmpty(); i++) taken.add(drawPile.pop());
        return taken;
    }

    @Override
    public void returnToDeckTop(List<GameCard> cards) {
        for (int i = cards.size() - 1; i >= 0; i--) drawPile.push(cards.get(i));
    }

    @Override
    public void destroyHero(String actorId, String ownerId, GameCard hero, boolean itemToActorHand) {
        PlayerState owner = players.get(ownerId);
        PlayerState actor = players.get(actorId);
        if (actor.has(Monster.Reward.CORRUPTED_SABRETOOTH) && owner.canHeroBeStolen()) {
            confirm(actorId, "confirm_steal_instead", new JSONObject().put("card", hero.getName()), hero, steal -> {
                if (steal) stealHero(actorId, ownerId, hero);
                else removeDestroyed(actor, owner, hero, itemToActorHand);
            });
            return;
        }
        removeDestroyed(actor, owner, hero, itemToActorHand);
    }

    private void removeDestroyed(PlayerState actor, PlayerState owner, GameCard hero, boolean itemToActorHand) {
        if (!owner.getParty().contains(hero)) return;
        if (hero.hasItemEffect(GameCard.ItemEffect.DECOY_DOLL)) {
            GameCard doll = hero.getItem();
            hero.setItem(null);
            discardPile.add(doll);
            log("decoy_doll", new JSONObject().put("actor", owner.getId()).put("cardName", hero.getName()));
            return;
        }
        owner.getParty().remove(hero);
        GameCard item = hero.getItem();
        hero.setItem(null);
        if (item != null) {
            if (itemToActorHand) actor.getHand().add(item);
            else discardPile.add(item);
        }
        discardPile.add(hero);
        broadcast(new JSONObject().put("type", "animation").put("subtype", "destroy_card")
                .put("payload", new JSONObject().put("cardId", hero.getId()).put("playerId", owner.getId())).toString());
        log("destroyed", new JSONObject().put("actor", actor.getId()).put("target", owner.getId()).put("cardName", hero.getName()));
        if (owner.has(Monster.Reward.DRACOS)) draw(owner.getId(), 1);
    }

    @Override
    public void sacrificeHero(String ownerId, GameCard hero) {
        PlayerState owner = players.get(ownerId);
        if (!owner.getParty().contains(hero)) return;
        if (hero.hasItemEffect(GameCard.ItemEffect.DECOY_DOLL)) {
            discardPile.add(hero.getItem());
            hero.setItem(null);
            log("decoy_doll", new JSONObject().put("actor", ownerId).put("cardName", hero.getName()));
            return;
        }
        owner.getParty().remove(hero);
        discard(hero);
        broadcast(new JSONObject().put("type", "animation").put("subtype", "destroy_card")
                .put("payload", new JSONObject().put("cardId", hero.getId()).put("playerId", ownerId)).toString());
        log("sacrificed", new JSONObject().put("actor", ownerId).put("cardName", hero.getName()));
    }

    @Override
    public void stealHero(String actorId, String ownerId, GameCard hero) {
        PlayerState owner = players.get(ownerId);
        if (!owner.getParty().remove(hero)) return;
        players.get(actorId).getParty().add(hero);
        broadcast(new JSONObject().put("type", "animation").put("subtype", "steal_card")
                .put("payload", new JSONObject().put("cardId", hero.getId()).put("playerId", ownerId).put("thiefId", actorId)).toString());
        log("stolen", new JSONObject().put("actor", actorId).put("target", ownerId).put("cardName", hero.getName()));
    }

    @Override
    public void playFree(String playerId, GameCard card) {
        if (card == null || !players.get(playerId).getHand().contains(card)) return;
        if (card.is(GameCard.Kind.ITEM) && equipTargets(playerId, card).isEmpty()) return;
        push(playSteps(playerId, card));
    }

    @Override
    public void rollHeroEffect(String playerId, GameCard hero) {
        push(heroRollSteps(playerId, hero));
    }

    @Override
    public void reveal(String viewerId, String ownerId, List<GameCard> cards, String reason) {
        // Shown as a view-only choice, so the flow waits until the player has seen the cards.
        List<JSONObject> options = new ArrayList<>();
        cards.forEach(c -> options.add(new JSONObject().put("id", String.valueOf(c.getId())).put("card", c.toJson())));
        JSONObject params = new JSONObject().put("target", ownerId).put("count", cards.size());
        push(List.of(() -> ask(viewerId, "view_" + reason, params, 0, 0, options, null, sel -> { })));
    }

    @Override
    public void log(String key, JSONObject params) {
        params.put("key", key).put("id", ++idSeq).put("ts", System.currentTimeMillis());
        log.add(params);
        while (log.size() > LOG_LIMIT) log.remove(0);
    }

    // =====================================================================
    // Serialization
    // =====================================================================

    private void broadcast(String message) {
        output.toAll(matchId, message);
    }

    private static String event(String subtype, JSONObject payload) {
        return new JSONObject().put("type", "match").put("subtype", subtype).put("payload", payload).toString();
    }

    private void setRecent(JSONObject result) {
        recent = result.put("seq", ++recentSeq);
    }

    private JSONObject duelJson(Duel d) {
        JSONObject json = new JSONObject()
                .put("type", "duel")
                .put("card", d.play.card.toJson())
                .put("ownerId", d.play.ownerId)
                .put("challengerId", d.challengerId)
                .put("ownerRoll", d.ownerRoll.toJson())
                .put("challengerRoll", d.challengerRoll.toJson());
        if (d.winnerId != null) json.put("winnerId", d.winnerId);
        return json;
    }

    private JSONObject modifierWindowJson(long now) {
        if (modifierWindow == null) return null;
        return new JSONObject()
                .put("holders", new JSONArray(modifierHolders()))
                .put("passed", new JSONArray(modifierWindow.passed))
                .put("targets", new JSONArray(modifierWindow.rolls.stream().map(Roll::getRollerId).toList()))
                .put("remainingMs", Math.max(0, modifierWindow.deadline - now))
                .put("durationMs", MODIFIER_WINDOW_MS);
    }

    private JSONObject pendingFor(String viewer, long now) {
        if (choice != null) return choice.toJson(viewer.equals(choice.getChooserId()), now);
        if (challengeWindow != null) {
            return new JSONObject()
                    .put("type", "challenge_window")
                    .put("card", challengeWindow.play.card.toJson())
                    .put("ownerId", challengeWindow.play.ownerId)
                    .put("eligible", new JSONArray(challengeWindow.eligible))
                    .put("passed", new JSONArray(challengeWindow.passed))
                    .put("remainingMs", Math.max(0, challengeWindow.deadline - now))
                    .put("durationMs", CHALLENGE_WINDOW_MS);
        }
        if (duel != null) {
            JSONObject json = duelJson(duel);
            JSONObject window = modifierWindowJson(now);
            if (window != null) json.put("modifierWindow", window);
            return json;
        }
        if (roll != null) {
            JSONObject json = new JSONObject().put("type", "roll").put("roll", roll.toJson());
            JSONObject window = modifierWindowJson(now);
            if (window != null) json.put("modifierWindow", window);
            return json;
        }
        return null;
    }

    private JSONObject stateFor(String viewer, long now) {
        JSONObject playersJson = new JSONObject();
        players.forEach((id, p) -> playersJson.put(id, p.toJson(id.equals(viewer))));
        JSONArray monsters = new JSONArray();
        monsterBoard.forEach(m -> monsters.put(m.toJson()));
        JSONArray discard = new JSONArray();
        for (int i = discardPile.size() - 1; i >= 0; i--) discard.put(discardPile.get(i).toJson());

        String turn = "";
        if (phase == Phase.PARTY_LEADER_SELECTION && leaderPickIndex < pickOrder.size()) turn = pickOrder.get(leaderPickIndex);
        else if (!turnOrder.isEmpty() && phase != Phase.ORDER_SELECTION) turn = turnOrder.get(turnIndex);

        JSONObject state = new JSONObject()
                .put("matchState", phase.name())
                .put("round", round)
                .put("startedAt", startedAt)
                .put("currentPlayerTurn", turn)
                .put("turnOrder", new JSONArray(turnOrder))
                .put("pickOrder", new JSONArray(pickOrder))
                .put("availablePartyLeaders", new JSONArray(availableLeaders))
                .put("players", playersJson)
                .put("monsters", monsters)
                .put("monsterDeckCount", monsterDeck.size())
                .put("drawPileCount", drawPile.size())
                .put("discardPile", discard)
                .put("log", new JSONArray(log))
                .put("idle", idle())
                .put("loaded", new JSONArray(loaded))
                .put("disconnected", new JSONArray(disconnectedUntil.keySet()));
        if (phase != Phase.GAMEPLAY && phase != Phase.FINISHED) state.put("setupRemainingMs", Math.max(0, setupDeadline - now));
        JSONObject pending = pendingFor(viewer, now);
        if (pending != null) state.put("pending", pending);
        if (recent != null) state.put("recent", recent);
        if (phase == Phase.FINISHED) state.put("winner", new JSONObject().put("playerId", winnerId == null ? JSONObject.NULL : winnerId).put("reason", winReason));
        return state;
    }
}
