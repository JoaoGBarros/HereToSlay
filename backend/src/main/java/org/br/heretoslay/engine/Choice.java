package org.br.heretoslay.engine;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

/**
 * A decision the engine is waiting on. Everyone sees the same selection screen: the chooser
 * gets the real options; the others get them too when they are public (players, Heroes on the
 * table, the discard pile), face down when they come from a hidden place (a hand, the deck),
 * and nothing at all for prompts that only show the chooser something.
 */
public class Choice {

    /** Prompts whose options are already visible on the table. */
    private static final Set<String> PUBLIC_PROMPTS = Set.of(
            "choose_player", "destroy_hero", "steal_hero", "sacrifice_hero", "give_hero",
            "return_item", "equip_target", "take_from_discard", "pull_card");
    /** Private prompts whose hidden cards come from the chooser's own hand. */
    private static final Set<String> FROM_OWN_HAND = Set.of("discard", "discard_up_to", "give_card", "play_from_hand");

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
    /** What the chooser has marked so far, mirrored live to everyone watching. */
    private List<String> preview = new ArrayList<>();

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
    public String getPrompt() { return prompt; }
    public JSONObject getParams() { return params; }
    public GameCard getSource() { return source; }
    public int getMin() { return min; }
    public List<JSONObject> getOptions() { return options; }
    public Consumer<List<String>> getOnAnswer() { return onAnswer; }
    public void setDeadline(long deadline) { this.deadline = deadline; }
    public long getDeadline() { return deadline; }

    /** Keeps only real option ids, at most `max` of them. */
    public void setPreview(List<String> selection) {
        Set<String> ids = new HashSet<>();
        options.forEach(o -> ids.add(o.getString("id")));
        List<String> valid = new ArrayList<>();
        for (String s : selection) {
            if (ids.contains(s) && !valid.contains(s) && valid.size() < max) valid.add(s);
        }
        preview = valid;
    }

    private List<JSONObject> spectatorOptions() {
        if (PUBLIC_PROMPTS.contains(prompt)) return options;
        if (options.stream().allMatch(o -> o.has("username") || "yes".equals(o.optString("id")) || "no".equals(o.optString("id")))) return options;
        String owner = FROM_OWN_HAND.contains(prompt) ? chooserId : "take_from_hand".equals(prompt) ? params.optString("target", null) : null;
        List<JSONObject> masked = new ArrayList<>();
        for (int i = 0; i < options.size(); i++) {
            JSONObject face = new JSONObject().put("id", options.get(i).getString("id")).put("hidden", true).put("index", i);
            if (owner != null) face.put("ownerId", owner);
            masked.add(face);
        }
        return masked;
    }

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
        json.put("preview", new JSONArray(preview));
        if (forChooser) {
            json.put("options", new JSONArray(options));
        } else if (!prompt.startsWith("view_") && !prompt.startsWith("notice_")) {
            json.put("options", new JSONArray(spectatorOptions()));
        }
        return json;
    }
}
