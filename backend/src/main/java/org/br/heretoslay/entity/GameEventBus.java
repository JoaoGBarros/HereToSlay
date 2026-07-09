package org.br.heretoslay.entity;

import org.br.heretoslay.entity.Card.Card;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

public class GameEventBus {

    public enum EventType {
        MODIFIER_PLAYED, CARD_DRAWN, HERO_DESTROYED, PLAYER_CHALLENGED, HERO_EFFECT_SUCCEEDED
    }

    public record GameEvent(EventType type, String playerId, Object payload) {
    }

    public interface Listener {
        void onEvent(GameEvent event);
    }

    private final Map<EventType, List<Listener>> listeners = new EnumMap<>(EventType.class);

    public void subscribe(EventType type, Listener listener) {
        listeners.computeIfAbsent(type, t -> new CopyOnWriteArrayList<>()).add(listener);
    }

    public void unsubscribe(EventType type, Listener listener) {
        List<Listener> forType = listeners.get(type);
        if (forType != null) {
            forType.remove(listener);
        }
    }

    public void publish(EventType type, String playerId, Object payload) {
        List<Listener> forType = listeners.get(type);
        if (forType == null) return;
        GameEvent event = new GameEvent(type, playerId, payload);
        for (Listener listener : forType) {
            listener.onEvent(event);
        }
    }

    public void publishCardDrawn(String playerId, Card card) {
        publish(EventType.CARD_DRAWN, playerId, card);
    }
}
