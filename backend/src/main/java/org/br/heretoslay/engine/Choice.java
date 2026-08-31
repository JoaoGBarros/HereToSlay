package org.br.heretoslay.engine;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

/**
 * A decision the engine is waiting on. Only the chooser receives the options
 * (they may contain private cards); everyone else just sees who is choosing.
 */
public class Choice {

    private final String id;
    private final String chooserId;
    private final String prompt;
    private final JSONObject params;
    private final int min;
    private final int max;
    private final List<JSONObject> options;
    private final GameCard source;
    private final Consumer<List<String>> onAnswer;
    private long deadline;

    public Choice(String id, String chooserId, String prompt, JSONObject params, int min, int max,
                  List<JSONObject> options, GameCard source, Consumer<List<String>> onAnswer) {
        this.id = id;
        this.chooserId = chooserId;
        this.prompt = prompt;
        this.params = params == null ? new JSONObject() : params;
        this.min = min;
        this.max = max;
        this.options = options;
        this.source = source;
        this.onAnswer = onAnswer;
    }

    public String getId() { return id; }
    public String getChooserId() { return chooserId; }
    public int getMin() { return min; }
    public List<JSONObject> getOptions() { return options; }
    public Consumer<List<String>> getOnAnswer() { return onAnswer; }
    public void setDeadline(long deadline) { this.deadline = deadline; }
    public long getDeadline() { return deadline; }

    public boolean isValid(List<String> selection) {
        if (selection.size() < min || selection.size() > max) return false;
        Set<String> ids = new HashSet<>();
        options.forEach(o -> ids.add(o.getString("id")));
        Set<String> seen = new HashSet<>();
        for (String s : selection) {
            if (!ids.contains(s) || !seen.add(s)) return false;
        }
        return true;
    }

    public JSONObject toJson(boolean forChooser, long now) {
        JSONObject json = new JSONObject()
                .put("type", "choice")
                .put("choiceId", id)
                .put("chooserId", chooserId)
                .put("prompt", prompt)
                .put("params", params)
                .put("min", min)
                .put("max", max)
                .put("remainingMs", Math.max(0, deadline - now));
        if (source != null) json.put("source", source.toJson());
        if (forChooser) json.put("options", new JSONArray(options));
        return json;
    }
}
