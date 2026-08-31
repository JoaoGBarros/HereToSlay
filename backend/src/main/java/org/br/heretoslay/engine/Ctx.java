package org.br.heretoslay.engine;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BooleanSupplier;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

/**
 * The running effect of one card: who owns it, the card itself, and values chosen
 * along the way. Every method returns a step; choices pause the flow until answered.
 */
public class Ctx {

    private final Table t;
    private final String owner;
    private final GameCard source;
    private final Map<String, Object> vars = new HashMap<>();

    public Ctx(Table table, String owner, GameCard source) {
        this.t = table;
        this.owner = owner;
        this.source = source;
    }

    public String owner() { return owner; }
    public GameCard source() { return source; }
    public PlayerState me() { return t.player(owner); }

    public void set(String key, Object value) { vars.put(key, value); }
    public String str(String key) { return (String) vars.get(key); }

    @SuppressWarnings("unchecked")
    public List<GameCard> cards(String key) {
        Object value = vars.get(key);
        return value instanceof List ? (List<GameCard>) value : Collections.emptyList();
    }

    public Supplier<String> varOf(String key) { return () -> str(key); }

    // ---------- option builders ----------

    static JSONObject heroOption(PlayerState owner, GameCard hero) {
        return new JSONObject().put("id", String.valueOf(hero.getId())).put("ownerId", owner.getId()).put("card", hero.toJson());
    }

    static JSONObject playerOption(PlayerState p) {
        return new JSONObject()
                .put("id", p.getId())
                .put("username", p.getUsername())
                .put("leader", p.getLeader() == null ? "" : p.getLeader().name())
                .put("handCount", p.getHand().size())
                .put("heroCount", p.heroes().size());
    }

    static JSONObject cardOption(GameCard card) {
        return new JSONObject().put("id", String.valueOf(card.getId())).put("card", card.toJson());
    }

    static JSONObject hiddenOption(String ownerId, GameCard card, int index) {
        return new JSONObject().put("id", String.valueOf(card.getId())).put("ownerId", ownerId).put("hidden", true).put("index", index);
    }

    private JSONObject params(Object... keyValues) {
        JSONObject json = new JSONObject().put("card", source == null ? "" : source.getName());
        for (int i = 0; i + 1 < keyValues.length; i += 2) json.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
        return json;
    }

    private static GameCard byId(List<GameCard> cards, String id) {
        long cardId = Long.parseLong(id);
        return cards.stream().filter(c -> c.getId() == cardId).findFirst().orElse(null);
    }

    private static String ownerOf(List<JSONObject> options, String id) {
        return options.stream().filter(o -> o.getString("id").equals(id)).findFirst().map(o -> o.getString("ownerId")).orElse(null);
    }

    // ---------- flow helpers ----------

    public Runnable when(BooleanSupplier condition, Runnable... steps) {
        return () -> {
            if (condition.getAsBoolean()) t.push(List.of(steps));
        };
    }

    /** Runs the given steps for each other player matching the filter, in turn order. */
    public Runnable forEachOther(Predicate<PlayerState> filter, Function<String, List<Runnable>> perPlayer) {
        return () -> {
            List<Runnable> steps = new ArrayList<>();
            for (PlayerState other : t.others(owner)) {
                if (filter.test(other)) steps.addAll(perPlayer.apply(other.getId()));
            }
            t.push(steps);
        };
    }

    public boolean drewKind(String var, GameCard.Kind kind) {
        return cards(var).stream().anyMatch(c -> c.is(kind));
    }

    public boolean firstIs(String var, GameCard.Kind kind) {
        List<GameCard> list = cards(var);
        return !list.isEmpty() && list.get(0).is(kind);
    }

    // ---------- cards and hands ----------

    public Runnable draw(int count) {
        return () -> set("drawn", t.draw(owner, count));
    }

    public Runnable drawUntilHandSize(int size) {
        return () -> {
            int missing = size - me().getHand().size();
            if (missing > 0) set("drawn", t.draw(owner, missing));
        };
    }

    public Runnable choosePlayer(String var, Predicate<PlayerState> filter) {
        return () -> {
            List<JSONObject> options = t.others(owner).stream().filter(filter).map(Ctx::playerOption).toList();
            t.ask(owner, "choose_player", params(), options.isEmpty() ? 0 : 1, 1, options, source,
                    sel -> set(var, sel.isEmpty() ? null : sel.get(0)));
        };
    }

    /** The given player chooses cards from their own hand to discard (exactly count, or up to count). */
    public Runnable discard(Supplier<String> who, int count, boolean upTo, String var) {
        return () -> {
            String chooser = who.get();
            PlayerState p = chooser == null ? null : t.player(chooser);
            if (p == null) return;
            List<JSONObject> options = p.getHand().stream().map(Ctx::cardOption).toList();
            int k = Math.min(count, options.size());
            t.ask(chooser, upTo ? "discard_up_to" : "discard", params("count", k), upTo ? 0 : k, k, options, source, sel -> {
                List<GameCard> discarded = new ArrayList<>();
                for (String id : sel) {
                    GameCard card = byId(p.getHand(), id);
                    if (card == null) continue;
                    p.getHand().remove(card);
                    t.discard(card);
                    discarded.add(card);
                }
                if (!discarded.isEmpty()) t.log("discarded", new JSONObject().put("actor", chooser).put("count", discarded.size()));
                set(var, discarded);
            });
        };
    }

    public Runnable discardOwn(int count) {
        return discard(() -> owner, count, false, "discarded");
    }

    /** The owner takes face-down cards from another player's hand. */
    public Runnable pull(Supplier<String> from, int count, String var) {
        return () -> {
            String targetId = from.get();
            PlayerState target = targetId == null ? null : t.player(targetId);
            if (target == null || target.getHand().isEmpty()) {
                set(var, List.of());
                return;
            }
            List<GameCard> shuffled = new ArrayList<>(target.getHand());
            Collections.shuffle(shuffled);
            List<JSONObject> options = new ArrayList<>();
            for (int i = 0; i < shuffled.size(); i++) options.add(hiddenOption(targetId, shuffled.get(i), i));
            int k = Math.min(count, options.size());
            t.ask(owner, "pull_card", params("count", k, "target", targetId), k, k, options, source, sel -> {
                List<GameCard> pulled = new ArrayList<>();
                for (String id : sel) {
                    GameCard card = byId(target.getHand(), id);
                    if (card == null) continue;
                    target.getHand().remove(card);
                    me().getHand().add(card);
                    pulled.add(card);
                }
                t.reveal(owner, targetId, pulled, "pulled");
                t.log("pulled", new JSONObject().put("actor", owner).put("target", targetId).put("count", pulled.size()));
                set(var, pulled);
            });
        };
    }

    /** Another player chooses a card from their own hand and gives it to the owner. */
    public Runnable giveToOwner(String giverId) {
        return () -> {
            PlayerState giver = t.player(giverId);
            List<JSONObject> options = giver.getHand().stream().map(Ctx::cardOption).toList();
            int k = Math.min(1, options.size());
            t.ask(giverId, "give_card", params("to", owner), k, k, options, source, sel -> {
                for (String id : sel) {
                    GameCard card = byId(giver.getHand(), id);
                    if (card == null) continue;
                    giver.getHand().remove(card);
                    me().getHand().add(card);
                    t.reveal(owner, giverId, List.of(card), "given");
                }
                t.log("gave", new JSONObject().put("actor", giverId).put("target", owner));
            });
        };
    }

    public Runnable lookAtHand(Supplier<String> from) {
        return () -> {
            String targetId = from.get();
            if (targetId == null) return;
            t.reveal(owner, targetId, new ArrayList<>(t.player(targetId).getHand()), "look");
            t.log("looked", new JSONObject().put("actor", owner).put("target", targetId));
        };
    }

    /** Silent Shadow: look at a hand and take the card you want. */
    public Runnable takeFromHand(Supplier<String> from) {
        return () -> {
            String targetId = from.get();
            PlayerState target = targetId == null ? null : t.player(targetId);
            if (target == null) return;
            List<JSONObject> options = target.getHand().stream().map(Ctx::cardOption).toList();
            int k = Math.min(1, options.size());
            t.ask(owner, "take_from_hand", params("target", targetId), k, k, options, source, sel -> {
                for (String id : sel) {
                    GameCard card = byId(target.getHand(), id);
                    if (card == null) continue;
                    target.getHand().remove(card);
                    me().getHand().add(card);
                }
                t.log("took_card", new JSONObject().put("actor", owner).put("target", targetId));
            });
        };
    }

    public Runnable tradeHands(Supplier<String> with) {
        return () -> {
            String targetId = with.get();
            if (targetId == null) return;
            PlayerState target = t.player(targetId);
            List<GameCard> mine = new ArrayList<>(me().getHand());
            me().getHand().clear();
            me().getHand().addAll(target.getHand());
            target.getHand().clear();
            target.getHand().addAll(mine);
            t.log("traded_hands", new JSONObject().put("actor", owner).put("target", targetId));
        };
    }

    public Runnable searchDiscard(GameCard.Kind kind) {
        return () -> {
            List<JSONObject> options = t.discardPile().stream().filter(c -> c.is(kind)).map(Ctx::cardOption).toList();
            if (options.isEmpty()) {
                t.ask(owner, "notice_nothing_found", params("kind", kind.name()), 0, 0, List.of(), source, sel -> { });
                return;
            }
            int k = Math.min(1, options.size());
            t.ask(owner, "take_from_discard", params("kind", kind.name()), k, k, options, source, sel -> {
                for (String id : sel) {
                    GameCard card = byId(t.discardPile(), id);
                    if (card == null) continue;
                    t.discardPile().remove(card);
                    me().getHand().add(card);
                    t.log("took_from_discard", new JSONObject().put("actor", owner).put("cardName", card.getName()));
                }
            });
        };
    }

    /** Beary Wise: pick one card from a set that just went to the discard pile. */
    public Runnable takeOneFromDiscarded(String poolVar) {
        return () -> {
            List<GameCard> pool = cards(poolVar).stream().filter(c -> t.discardPile().contains(c)).toList();
            List<JSONObject> options = pool.stream().map(Ctx::cardOption).toList();
            int k = Math.min(1, options.size());
            t.ask(owner, "take_from_cards", params(), k, k, options, source, sel -> {
                for (String id : sel) {
                    GameCard card = byId(pool, id);
                    if (card == null) continue;
                    t.discardPile().remove(card);
                    me().getHand().add(card);
                }
            });
        };
    }

    public Runnable appendTo(String poolVar, String fromVar) {
        return () -> {
            List<GameCard> pool = new ArrayList<>(cards(poolVar));
            pool.addAll(cards(fromVar));
            set(poolVar, pool);
        };
    }

    /** Bullseye: keep one of the top 3, return the rest on top in the chosen order. */
    public Runnable keepOneFromTop(int count) {
        return () -> {
            List<GameCard> top = t.takeFromDeck(count);
            if (top.isEmpty()) return;
            List<JSONObject> options = top.stream().map(Ctx::cardOption).toList();
            t.ask(owner, "keep_from_top", params(), 1, 1, options, source, sel -> {
                GameCard kept = byId(top, sel.get(0));
                List<GameCard> rest = new ArrayList<>(top);
                rest.remove(kept);
                me().getHand().add(kept);
                if (rest.size() < 2) {
                    t.returnToDeckTop(rest);
                    return;
                }
                List<JSONObject> restOptions = rest.stream().map(Ctx::cardOption).toList();
                t.ask(owner, "top_order", params(), 1, 1, restOptions, source, first -> {
                    GameCard onTop = byId(rest, first.get(0));
                    List<GameCard> ordered = new ArrayList<>();
                    ordered.add(onTop);
                    rest.stream().filter(c -> c != onTop).forEach(ordered::add);
                    t.returnToDeckTop(ordered);
                });
            });
        };
    }

    // ---------- playing more cards ----------

    /** "If that card is a X card, you may play it immediately." */
    public Runnable mayPlayIf(String var, GameCard.Kind kind) {
        return () -> {
            List<GameCard> candidates = cards(var).stream().filter(c -> c.is(kind) && me().getHand().contains(c)).toList();
            if (candidates.isEmpty()) return;
            if (candidates.size() == 1) {
                GameCard card = candidates.get(0);
                t.confirm(owner, "confirm_play", params("target", card.getName()), card, yes -> {
                    set("playedNow", yes);
                    if (yes) t.playFree(owner, card);
                });
                return;
            }
            List<JSONObject> options = candidates.stream().map(Ctx::cardOption).toList();
            t.ask(owner, "play_from_cards", params("kind", kind.name()), 0, 1, options, source, sel -> {
                set("playedNow", !sel.isEmpty());
                if (!sel.isEmpty()) t.playFree(owner, byId(candidates, sel.get(0)));
            });
        };
    }

    /** "Play a X card from your hand immediately." */
    public Runnable playFromHand(GameCard.Kind kind) {
        return () -> {
            List<GameCard> candidates = me().getHand().stream().filter(c -> c.is(kind)).toList();
            List<JSONObject> options = candidates.stream().map(Ctx::cardOption).toList();
            t.ask(owner, "play_from_hand", params("kind", kind.name()), 0, Math.min(1, options.size()), options, source, sel -> {
                if (!sel.isEmpty()) t.playFree(owner, byId(candidates, sel.get(0)));
            });
        };
    }

    // ---------- party: destroy, steal, sacrifice, items ----------

    public Runnable destroy(int count, boolean itemToHand) {
        return () -> {
            List<JSONObject> options = new ArrayList<>();
            for (PlayerState other : t.others(owner)) {
                if (!other.canHeroBeDestroyed()) continue;
                other.heroes().forEach(h -> options.add(heroOption(other, h)));
            }
            int k = Math.min(count, options.size());
            t.ask(owner, "destroy_hero", params("count", k), k, k, options, source, sel -> {
                List<Runnable> steps = new ArrayList<>();
                for (String id : sel) {
                    String ownerId = ownerOf(options, id);
                    steps.add(() -> {
                        GameCard hero = t.player(ownerId).findInParty(Long.parseLong(id));
                        if (hero != null) t.destroyHero(owner, ownerId, hero, itemToHand);
                    });
                }
                t.push(steps);
            });
        };
    }

    public Runnable destroy(int count) {
        return destroy(count, false);
    }

    /** STEAL a Hero card, optionally only from the player stored in fromVar. */
    public Runnable steal(String fromVar) {
        return () -> {
            String only = fromVar == null ? null : str(fromVar);
            List<JSONObject> options = new ArrayList<>();
            for (PlayerState other : t.others(owner)) {
                if (only != null && !only.equals(other.getId())) continue;
                if (!other.canHeroBeStolen()) continue;
                other.heroes().forEach(h -> options.add(heroOption(other, h)));
            }
            int k = Math.min(1, options.size());
            t.ask(owner, "steal_hero", params(), k, k, options, source, sel -> {
                set("stolen", List.of());
                for (String id : sel) {
                    String ownerId = ownerOf(options, id);
                    GameCard hero = t.player(ownerId).findInParty(Long.parseLong(id));
                    if (hero == null) continue;
                    t.stealHero(owner, ownerId, hero);
                    set("stolen", List.of(hero));
                    set("stolenFrom", ownerId);
                }
            });
        };
    }

    /** Wiggles: roll to use the stolen Hero's effect right away. */
    public Runnable rollStolen() {
        return () -> cards("stolen").forEach(h -> t.rollHeroEffect(owner, h));
    }

    /** The given player chooses one of their own Heroes to sacrifice. */
    public Runnable sacrificeBy(Supplier<String> who) {
        return () -> {
            String victimId = who.get();
            PlayerState victim = victimId == null ? null : t.player(victimId);
            if (victim == null) return;
            List<JSONObject> options = victim.heroes().stream().map(h -> heroOption(victim, h)).toList();
            int k = Math.min(1, options.size());
            t.ask(victimId, "sacrifice_hero", params(), k, k, options, source, sel -> {
                for (String id : sel) {
                    GameCard hero = victim.findInParty(Long.parseLong(id));
                    if (hero != null) t.sacrificeHero(victimId, hero);
                }
            });
        };
    }

    /** Forced Exchange: move one of your Heroes to the chosen player's party. */
    public Runnable giveOwnHero(String toVar) {
        return () -> {
            String targetId = str(toVar);
            if (targetId == null) return;
            List<JSONObject> options = me().heroes().stream().map(h -> heroOption(me(), h)).toList();
            int k = Math.min(1, options.size());
            t.ask(owner, "give_hero", params("target", targetId), k, k, options, source, sel -> {
                for (String id : sel) {
                    GameCard hero = me().findInParty(Long.parseLong(id));
                    if (hero == null) continue;
                    me().getParty().remove(hero);
                    t.player(targetId).getParty().add(hero);
                    t.log("moved_hero", new JSONObject().put("actor", owner).put("target", targetId).put("cardName", hero.getName()));
                }
            });
        };
    }

    /** Tipsy Tootie moves itself to the chosen player's party. */
    public Runnable moveSourceTo(String toVar) {
        return () -> {
            String targetId = str(toVar);
            if (targetId == null || !me().getParty().remove(source)) return;
            t.player(targetId).getParty().add(source);
            t.log("moved_hero", new JSONObject().put("actor", owner).put("target", targetId).put("cardName", source.getName()));
        };
    }

    /** Winds of Change: return one equipped Item (any player) to its owner's hand. */
    public Runnable returnOneItem(boolean cursedOnOwnParty) {
        return () -> {
            List<JSONObject> options = new ArrayList<>();
            List<PlayerState> owners = new ArrayList<>();
            owners.add(me());
            if (!cursedOnOwnParty) owners.addAll(t.others(owner));
            for (PlayerState p : owners) {
                for (GameCard hero : p.heroes()) {
                    GameCard item = hero.getItem();
                    if (item == null || (cursedOnOwnParty && !item.isCursed())) continue;
                    options.add(new JSONObject().put("id", String.valueOf(item.getId())).put("ownerId", p.getId())
                            .put("card", item.toJson()).put("hero", hero.toJson()));
                }
            }
            int k = Math.min(1, options.size());
            t.ask(owner, "return_item", params(), k, k, options, source, sel -> {
                for (String id : sel) {
                    long itemId = Long.parseLong(id);
                    for (PlayerState p : owners) {
                        for (GameCard hero : p.heroes()) {
                            if (hero.getItem() == null || hero.getItem().getId() != itemId) continue;
                            GameCard item = hero.getItem();
                            hero.setItem(null);
                            // Holy Curselifter returns the cursed item to the hero owner's hand too.
                            p.getHand().add(item);
                            t.log("item_returned", new JSONObject().put("actor", owner).put("target", p.getId()).put("cardName", item.getName()));
                        }
                    }
                }
            });
        };
    }

    public Runnable returnAllItems() {
        return () -> {
            List<PlayerState> everyone = new ArrayList<>();
            everyone.add(me());
            everyone.addAll(t.others(owner));
            for (PlayerState p : everyone) {
                for (GameCard hero : p.heroes()) {
                    if (hero.getItem() == null) continue;
                    p.getHand().add(hero.getItem());
                    hero.setItem(null);
                }
            }
            t.log("all_items_returned", new JSONObject().put("actor", owner));
        };
    }

    // ---------- statuses ----------

    public Runnable rollBonus(int amount) {
        return () -> {
            me().addTurnBonus(amount, source.getName());
            t.log("roll_bonus", new JSONObject().put("actor", owner).put("value", amount));
        };
    }

    public Runnable protectFromSteal() {
        return () -> me().setProtectedFromSteal(true);
    }

    public Runnable protectFromDestroy() {
        return () -> me().setProtectedFromDestroy(true);
    }

    public Runnable unchallengeable() {
        return () -> me().setUnchallengeableThisTurn(true);
    }

    /** Plundering Puma: the robbed player may DRAW a card. */
    public Runnable mayDraw(Supplier<String> who) {
        return () -> {
            String playerId = who.get();
            if (playerId == null) return;
            t.confirm(playerId, "confirm_draw", params(), source, yes -> {
                if (yes) t.draw(playerId, 1);
            });
        };
    }

    /** Pan Chucks: reveal a drawn Challenge card to DESTROY a Hero. */
    public Runnable mayRevealChallengeThenDestroy() {
        return () -> {
            if (!drewKind("drawn", GameCard.Kind.CHALLENGE)) return;
            t.confirm(owner, "confirm_reveal", params(), source, yes -> {
                if (!yes) return;
                GameCard challenge = cards("drawn").stream().filter(c -> c.is(GameCard.Kind.CHALLENGE)).findFirst().orElseThrow();
                t.log("revealed", new JSONObject().put("actor", owner).put("cardName", challenge.getName()));
                t.push(List.of(destroy(1)));
            });
        };
    }

    public Object flag(String key) {
        return vars.get(key);
    }

    /** Slippery Paws: discard one of the cards just pulled. */
    public Runnable discardFromPulled(String var) {
        return () -> {
            List<GameCard> pulled = cards(var).stream().filter(c -> me().getHand().contains(c)).toList();
            List<JSONObject> options = pulled.stream().map(Ctx::cardOption).toList();
            int k = Math.min(1, options.size());
            t.ask(owner, "discard", params("count", k), k, k, options, source, sel -> {
                for (String id : sel) {
                    GameCard card = byId(pulled, id);
                    if (card == null) continue;
                    me().getHand().remove(card);
                    t.discard(card);
                }
            });
        };
    }

    public Runnable destroyPerDiscarded(String var) {
        return () -> {
            int count = cards(var).size();
            if (count > 0) t.push(List.of(destroy(count)));
        };
    }
}
