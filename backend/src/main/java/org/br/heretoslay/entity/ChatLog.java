package org.br.heretoslay.entity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Player chat for a lobby or a match: sanitizes text, rate limits each sender
 * and keeps a short history for players who join late or reconnect.
 */
public class ChatLog {

    public static final int MAX_LENGTH = 200;
    private static final int HISTORY_SIZE = 40;
    private static final long MIN_INTERVAL_MS = 600;

    private final Deque<JSONObject> history = new ArrayDeque<>();
    private final Map<String, Long> lastSentAt = new ConcurrentHashMap<>();

    /**
     * Records a message.
     *
     * @return the message to broadcast, or null when the text is empty or the sender is sending too fast
     */
    public synchronized JSONObject append(String playerId, String username, String rawText) {
        String text = sanitize(rawText);
        if (text.isEmpty()) return null;

        long now = System.currentTimeMillis();
        Long previous = lastSentAt.get(playerId);
        if (previous != null && now - previous < MIN_INTERVAL_MS) return null;
        lastSentAt.put(playerId, now);

        JSONObject message = new JSONObject()
                .put("playerId", playerId)
                .put("username", username == null ? "?" : username)
                .put("text", text)
                .put("timestamp", now);
        history.addLast(message);
        while (history.size() > HISTORY_SIZE) history.removeFirst();
        return message;
    }

    public synchronized JSONArray history() {
        return new JSONArray(history);
    }

    static String sanitize(String raw) {
        if (raw == null) return "";
        String cleaned = raw.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").trim();
        return cleaned.length() > MAX_LENGTH ? cleaned.substring(0, MAX_LENGTH) : cleaned;
    }
}
