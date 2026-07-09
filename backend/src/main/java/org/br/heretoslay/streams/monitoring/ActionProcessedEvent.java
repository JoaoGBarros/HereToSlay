package org.br.heretoslay.streams.monitoring;

import org.json.JSONObject;

/**
 * The "evento composto" required by the assignment: correlates a raw player
 * action (game-actions-in) with the resulting state update the server
 * produced (game-state-out) via a windowed stream-stream join, keyed by
 * matchId. See GameMonitoringStreamsProcessor.
 */
public class ActionProcessedEvent {

    public static String correlate(String actionJson, String stateJson) {
        try {
            JSONObject action = new JSONObject(actionJson);
            JSONObject state = new JSONObject(stateJson);
            return MonitoringAlert.actionProcessed(action, state);
        } catch (Exception e) {
            return null;
        }
    }
}
