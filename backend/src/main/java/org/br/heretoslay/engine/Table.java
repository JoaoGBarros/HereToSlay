package org.br.heretoslay.engine;

import org.json.JSONObject;

import java.util.List;
import java.util.function.Consumer;

/** What card effects can do to the match. Implemented by Match. */
public interface Table {

    PlayerState player(String id);

    /** Other players in turn order, starting after the given player. */
    List<PlayerState> others(String id);

    /** Inserts steps at the front of the flow, keeping their order. */
    void push(List<Runnable> steps);

    /** Pauses the flow until the chooser answers (or it times out). Answers immediately when no real choice exists. */
    void ask(String chooserId, String prompt, JSONObject params, int min, int max, List<JSONObject> options,
             GameCard source, Consumer<List<String>> onAnswer);

    void confirm(String chooserId, String prompt, JSONObject params, GameCard source, Consumer<Boolean> onAnswer);

    List<GameCard> draw(String playerId, int count);

    void discard(GameCard card);

    List<GameCard> discardPile();

    /** Removes and returns up to count cards from the top of the deck. */
    List<GameCard> takeFromDeck(int count);

    /** Puts cards back on the deck; the first one ends on top. */
    void returnToDeckTop(List<GameCard> cards);

    void destroyHero(String actorId, String ownerId, GameCard hero, boolean itemToActorHand);

    void sacrificeHero(String ownerId, GameCard hero);

    void stealHero(String actorId, String ownerId, GameCard hero);

    /** Plays a card from the player's hand without spending action points (it can still be challenged). */
    void playFree(String playerId, GameCard card);

    /** Rolls a party Hero's effect without spending action points. */
    void rollHeroEffect(String playerId, GameCard hero);

    /** Shows cards privately to one player (hand looks, pulled cards). */
    void reveal(String viewerId, String ownerId, List<GameCard> cards, String reason);

    void log(String key, JSONObject params);
}
