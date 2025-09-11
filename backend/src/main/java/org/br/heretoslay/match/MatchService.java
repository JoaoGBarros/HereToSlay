package org.br.heretoslay.match;

import org.br.heretoslay.auth.AuthService;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.br.heretoslay.entity.PartyLeader;
import org.java_websocket.WebSocket;
import org.json.JSONObject;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class MatchService {

    private static final MatchService instance = new MatchService();
    private final Map<Long, Match> matches = new ConcurrentHashMap<>();

    public static MatchService getInstance() {
        if(instance == null) {
            return new MatchService();
        }
        return instance;
    }


    public void startMatch(Long id, List<WebSocket> connections) {
        Match match = new Match(connections);
        matches.put(id, match);
    }

    private MatchService() {}




    public void handleMessage(WebSocket conn, JSONObject json) {
        String type = json.getString("subtype");
        Long id = json.getLong("id");

        switch (type) {
            case "get_match_state":
                JSONObject matchResponse = new JSONObject();
                matchResponse.put("type", "match");
                matchResponse.put("subtype", "match_state");
                matchResponse.put("payload", this.matches.get(id).getMatchState());
                conn.send(matchResponse.toString());
                break;
            case "order_selection":
                int roll = json.getJSONObject("payload").getInt("roll");
                Match match = matches.get(id);
                match.processOrderSelectionRoll(conn, roll);
                break;
            case "choose_party_leader":
                String chosenLeader = json.getJSONObject("payload").getString("party_leader");
                Match matchChoose = matches.get(id);
                boolean success = matchChoose.choosePartyLeader(conn, chosenLeader);
                JSONObject response = new JSONObject();
                response.put("type", "match");
                response.put("subtype", "party_leader_chosen");
                response.put("payload", new JSONObject().put("success", success));
                conn.send(response.toString());
                break;
            case "action":
                String action = json.getString("action");
                Match matchAction = matches.get(id);
                matchAction.performAction(conn, action, json);
                break;
            case "challenge":
                Match matchChallenge = matches.get(id);
                matchChallenge.challengeHero(conn);
                break;


            case "process_challenge_roll":
                roll = json.getJSONObject("payload").getInt("roll");
                Match matchRoll = matches.get(id);
                matchRoll.processDuelRoll(conn, roll);
                break;

            default:
                System.out.println("Unknown match subtype: " + type);
                break;
        }

    }



}
