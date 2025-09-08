package org.br.heretoslay.lobby;

import org.br.heretoslay.auth.AuthService;
import org.br.heretoslay.entity.Lobby;
import org.br.heretoslay.entity.LobbyStatus;
import org.br.heretoslay.match.MatchService;
import org.java_websocket.WebSocket;
import org.json.JSONObject;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class LobbyService {
    private static final LobbyService instance = new LobbyService();
    private final Map<Long, Lobby> lobbies = new ConcurrentHashMap<>();

    public static LobbyService getInstance() {
        if(instance == null) {
            return new LobbyService();
        }
        return instance;
    }

    private LobbyService() {}

    public Long createLobby(int maxPlayers, int minPlayers, String name) {
        Lobby lobby = new Lobby((long)(lobbies.size() + 1), name, maxPlayers, minPlayers);
        lobbies.put(lobby.getId(), lobby);
        return lobby.getId();
    }

    private void broadcastLobbies() {
        JSONObject message = new JSONObject();
        message.put("type", "lobby");
        message.put("subtype", "list_update");
        message.put("payload", lobbies.values().stream().map(lobby -> {
            JSONObject lobbyJson = new JSONObject();
            lobbyJson.put("id", lobby.getId());
            lobbyJson.put("name", lobby.getName());
            lobbyJson.put("playerAmount", lobby.getPlayers().size());
            lobbyJson.put("maxPlayers", lobby.getMaxPlayers());
            lobbyJson.put("status", lobby.getStatus().toString());
            return lobbyJson;
        }).toList());

        String messageStr = message.toString();
        lobbies.values().forEach(lobby -> {
            lobby.getPlayers().forEach(playerConn -> playerConn.send(messageStr));
        });

    }

    public void broadcastToLobby(Long lobbyId, JSONObject message) {
        Lobby lobby = lobbies.get(lobbyId);
        if (lobby != null) {
            String messageStr = message.toString();
            lobby.getPlayers().forEach(playerConn -> playerConn.send(messageStr));
        }
    }

    private void checkAndHandleCountdown(Lobby lobby) {
        if (lobby.getPlayers().size() >= lobby.getMinPlayers()) {
            if (lobby.getCountdownTimeLeft() == -1) {
                lobby.startCountdown(
                    () -> {
                        lobby.setStatus(LobbyStatus.IN_PROGRESS);
                        MatchService.getInstance().startMatch(lobby.getId(), lobby.getPlayers().stream().toList());
                        JSONObject startMsg = new JSONObject();
                        startMsg.put("type", "lobby");
                        startMsg.put("subtype", "countdown_finished");
                        broadcastToLobby(lobby.getId(), startMsg);
                        lobbies.remove(lobby.getId());
                    },
                    () -> sendCountdownUpdate(lobby)
                );
                sendCountdownUpdate(lobby);
            }
        } else {
            if (lobby.getCountdownTimeLeft() != -1) {
                lobby.resetCountdown();
                sendCountdownUpdate(lobby);
            }
        }
    }

    private void sendCountdownUpdate(Lobby lobby) {
        JSONObject countdownMsg = new JSONObject();
        countdownMsg.put("type", "lobby");
        countdownMsg.put("subtype", "countdown_update");
        countdownMsg.put("payload", new JSONObject()
                .put("timeLeft", lobby.getCountdownTimeLeft())
                .put("playerAmount", lobby.getPlayers().size())
                .put("minPlayers", lobby.getMinPlayers())
        );
        broadcastToLobby(lobby.getId(), countdownMsg);
    }

    public void handleMessage(WebSocket conn, JSONObject json) {
        String type = json.getString("subtype");

        switch (type) {
            case "create":
                int maxPlayers = json.getJSONObject("payload").getInt("maxPlayers");
                int minPlayers = json.getJSONObject("payload").getInt("minPlayers");
                String name = json.getJSONObject("payload").getString("name");
                Long lobbyId = createLobby(maxPlayers, minPlayers, name);
                JSONObject response = new JSONObject();
                response.put("type", "lobby");
                response.put("subtype", "create_success");
                response.put("payload", new JSONObject().put("lobbyId", lobbyId));
                conn.send(response.toString());
                System.out.println("Lobby created with ID: " + lobbyId);
                broadcastLobbies();
                break;

            case "join":
                Long joinLobbyId = json.getJSONObject("payload").getLong("lobbyId");
                Lobby lobbyToJoin = lobbies.get(joinLobbyId);
                if (lobbyToJoin != null) {


                    if(lobbyToJoin.getPlayers().size() >= lobbyToJoin.getMaxPlayers()) {
                        JSONObject fullResponse = new JSONObject();
                        fullResponse.put("type", "lobby");
                        fullResponse.put("subtype", "join_fail");
                        fullResponse.put("payload", new JSONObject().put("reason", "Lobby is full"));
                        conn.send(fullResponse.toString());
                        return;
                    }

                    lobbyToJoin.addPlayer(conn);
                    if(lobbyToJoin.getPlayers().size() < lobbyToJoin.getMinPlayers()) {
                        lobbyToJoin.setStatus(LobbyStatus.WAITING_FOR_PLAYERS);
                    }else{
                        lobbyToJoin.setStatus(LobbyStatus.STARTING);
                    }

                    List<String> usernames = lobbyToJoin.getPlayers().stream()
                            .map(playerConn -> AuthService.getInstance().getPlayerByConnection(playerConn).getUsername())
                            .toList();

                    JSONObject lobbyInfo = new JSONObject();
                    lobbyInfo.put("id", lobbyToJoin.getId());
                    lobbyInfo.put("name", lobbyToJoin.getName());
                    lobbyInfo.put("playerAmount", lobbyToJoin.getPlayers().size());
                    lobbyInfo.put("maxPlayers", lobbyToJoin.getMaxPlayers());
                    lobbyInfo.put("username", usernames);

                    JSONObject joinResponse = new JSONObject();
                    joinResponse.put("type", "lobby");
                    joinResponse.put("subtype", "lobby_update");
                    joinResponse.put("payload", lobbyInfo);

                    broadcastToLobby(joinLobbyId, joinResponse);

                    // Lógica do countdown
                    checkAndHandleCountdown(lobbyToJoin);
                }
                break;

            case "leave":
                Long leaveLobbyId = json.getJSONObject("payload").getLong("lobbyId");
                Lobby lobbyToLeave = lobbies.get(leaveLobbyId);
                if (lobbyToLeave != null){
                    lobbyToLeave.getPlayers().remove(conn);
                    if(lobbyToLeave.getPlayers().size() < lobbyToLeave.getMinPlayers()) {
                        lobbyToLeave.setStatus(LobbyStatus.WAITING_FOR_PLAYERS);
                    }
                    List<String> usernames = lobbyToLeave.getPlayers().stream()
                            .map(playerConn -> AuthService.getInstance().getPlayerByConnection(playerConn).getUsername())
                            .toList();

                    JSONObject lobbyInfo = new JSONObject();
                    lobbyInfo.put("id", lobbyToLeave.getId());
                    lobbyInfo.put("name", lobbyToLeave.getName());
                    lobbyInfo.put("playerAmount", lobbyToLeave.getPlayers().size());
                    lobbyInfo.put("maxPlayers", lobbyToLeave.getMaxPlayers());
                    lobbyInfo.put("username", usernames);
                    JSONObject leaveResponse = new JSONObject();
                    leaveResponse.put("type", "lobby");
                    leaveResponse.put("subtype", "lobby_update");
                    leaveResponse.put("payload", lobbyInfo);
                    broadcastToLobby(leaveLobbyId, leaveResponse);

                    leaveResponse.put("subtype", "leave_response");
                    leaveResponse.remove("payload");
                    conn.send(leaveResponse.toString());

                    // Resetar countdown se necessário
                    checkAndHandleCountdown(lobbyToLeave);
                }
                break;

            case "list":
                JSONObject listResponse = new JSONObject();
                listResponse.put("type", "lobby");
                listResponse.put("subtype", "list_response");

                listResponse.put("payload", lobbies.values().stream().map(lobby -> {
                    JSONObject lobbyJson = new JSONObject();
                    lobbyJson.put("id", lobby.getId());
                    lobbyJson.put("name", lobby.getName());
                    lobbyJson.put("playerAmount", lobby.getPlayers().size());
                    lobbyJson.put("maxPlayers", lobby.getMaxPlayers());
                    lobbyJson.put("status", lobby.getStatus().toString());
                    return lobbyJson;
                }).toList());

                conn.send(listResponse.toString());
                break;
            default:
                System.out.println("Unknown lobby subtype: " + type);
                break;
        }
    }
}