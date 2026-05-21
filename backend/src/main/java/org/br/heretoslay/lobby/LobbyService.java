package org.br.heretoslay.lobby;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.br.heretoslay.entity.Lobby;
import org.br.heretoslay.entity.LobbyStatus;
import org.json.JSONArray;
import org.json.JSONObject;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class LobbyService {
    private static final LobbyService instance = new LobbyService();
    private final Map<Long, Lobby> lobbies = new ConcurrentHashMap<>();
    private KafkaProducer<String, String> kafkaProducer;
    private final Map<String, String> playerUsernames = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();

    public static LobbyService getInstance() {
        if(instance == null) {
            return new LobbyService();
        }
        return instance;
    }

    private LobbyService() {
        initKafka();
    }

    private void initKafka() {
        Properties producerProps = new Properties();
        String kafkaServer = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        if (kafkaServer == null) kafkaServer = "localhost:9092";

        producerProps.put("bootstrap.servers", kafkaServer);
        producerProps.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put("acks", "all");  // Aguarda todas as replicas ISR confirmarem
        this.kafkaProducer = new KafkaProducer<>(producerProps);

        new Thread(this::startKafkaConsumer).start();
        new Thread(this::startStateStoreConsumer).start();
    }

    private void startKafkaConsumer() {
        Properties consumerProps = new Properties();
        String kafkaServer = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        if (kafkaServer == null) kafkaServer = "localhost:9092";

        consumerProps.put("bootstrap.servers", kafkaServer);
        consumerProps.put("group.id", "heretoslay-lobby");
        consumerProps.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(consumerProps);
        consumer.subscribe(Collections.singletonList("lobby-actions-in"));

        while (true) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(1000));
            for (ConsumerRecord<String, String> record : records) {
                handleMessage(new JSONObject(record.value()));
            }
        }
    }

    public Long createLobby(int maxPlayers, int minPlayers, String name) {
        Long uniqueId = System.currentTimeMillis();
        Lobby lobby = new Lobby(uniqueId, name, maxPlayers, minPlayers);
        lobbies.put(lobby.getId(), lobby);
        System.out.println("Lobby criado");
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

        publishLobbyState("ALL", message);
    }

    public void broadcastToLobby(Long lobbyId, JSONObject message) {
        Lobby lobby = lobbies.get(lobbyId);
        if (lobby != null) {
            JSONArray targets = new JSONArray(lobby.getPlayers());
            publishLobbyState(targets, message);
        }
    }

    private void sendToPlayer(String playerId, JSONObject payload) {
        publishLobbyState(new JSONArray().put(playerId), payload);
    }

    private void publishLobbyState(Object targets, JSONObject payload) {
        JSONObject wrapper = new JSONObject();
        if (targets instanceof String) {
            wrapper.put("targetPlayers", new JSONArray().put(targets));
        } else {
            wrapper.put("targetPlayers", targets);
        }
        wrapper.put("payload", payload);

        ProducerRecord<String, String> record = new ProducerRecord<>("lobby-state-out", UUID.randomUUID().toString(), wrapper.toString());
        this.kafkaProducer.send(record);
    }

    private void checkAndHandleCountdown(Lobby lobby) {
        if (lobby.getPlayers().size() >= lobby.getMinPlayers()) {
            if (lobby.getCountdownTimeLeft() == -1) {
                lobby.startCountdown(
                        () -> {
                            lobby.setStatus(LobbyStatus.IN_PROGRESS);
                            JSONArray playersArray = new JSONArray();

                            for (String playerId : lobby.getPlayers()) {
                                JSONObject pJson = new JSONObject();
                                pJson.put("id", playerId);
                                pJson.put("username", playerUsernames.get(playerId));
                                playersArray.put(pJson);
                            }

                            JSONObject startMatchEvent = new JSONObject();
                            startMatchEvent.put("id", lobby.getId());
                            startMatchEvent.put("subtype", "start_match");
                            startMatchEvent.put("players", playersArray);

                            ProducerRecord<String, String> engineRecord = new ProducerRecord<>("game-actions-in", lobby.getId().toString(), startMatchEvent.toString());
                            this.kafkaProducer.send(engineRecord);

                            JSONObject startMsg = new JSONObject();
                            startMsg.put("type", "lobby");
                            startMsg.put("subtype", "countdown_finished");
                            broadcastToLobby(lobby.getId(), startMsg);

                            lobbies.remove(lobby.getId());
                            deleteStateFromKafka(lobby.getId());
                            broadcastLobbies();
                        },
                        () -> sendCountdownUpdate(lobby)
                );
                sendCountdownUpdate(lobby);
                broadcastLobbies();
            }
        } else {
            if (lobby.getCountdownTimeLeft() != -1) {
                lobby.resetCountdown();
                sendCountdownUpdate(lobby);
                broadcastLobbies();
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

    public void handleMessage(JSONObject json) {
        String type = json.getString("subtype");
        String playerId = json.getString("playerId");

        if (json.has("username")) {
            playerUsernames.put(playerId, json.getString("username"));
        }

        switch (type) {
            case "create":
                int maxPlayers = json.getJSONObject("payload").getInt("maxPlayers");
                int minPlayers = json.getJSONObject("payload").getInt("minPlayers");
                String name = json.getJSONObject("payload").getString("name");
                Long lobbyId = createLobby(maxPlayers, minPlayers, name);

                // Adiciona criador como player do lobby
                Lobby createdLobby = lobbies.get(lobbyId);
                if (createdLobby != null) {
                    createdLobby.setStatus(LobbyStatus.WAITING_FOR_PLAYERS);
                }

                // Envia confirmação de criação para o criador
                JSONObject response = new JSONObject();
                response.put("type", "lobby");
                response.put("subtype", "create_success");
                response.put("payload", new JSONObject().put("lobbyId", lobbyId));
                sendToPlayer(playerId, response);

                // Notifica criador sobre seu próprio lobby
                if (createdLobby != null) {
                    JSONArray creatorUsernamesArray = new JSONArray();
                    for (String id : createdLobby.getPlayers()) {
                        creatorUsernamesArray.put(playerUsernames.getOrDefault(id, "Unknown"));
                    }

                    JSONObject lobbyInfo = new JSONObject();
                    lobbyInfo.put("id", lobbyId);
                    lobbyInfo.put("name", name);
                    lobbyInfo.put("playerAmount", createdLobby.getPlayers().size());
                    lobbyInfo.put("maxPlayers", maxPlayers);
                    lobbyInfo.put("username", creatorUsernamesArray);

                    JSONObject creatorMsg = new JSONObject();
                    creatorMsg.put("type", "lobby");
                    creatorMsg.put("subtype", "lobby_update");
                    creatorMsg.put("payload", lobbyInfo);

                    broadcastToLobby(lobbyId, creatorMsg);
                }

                // Notifica todos sobre a nova lobby na lista
                broadcastLobbies();
                persistStateToKafka(createdLobby);
                break;

            case "join":
                Long joinLobbyId = json.getJSONObject("payload").getLong("lobbyId");
                Lobby lobbyToJoin = lobbies.get(joinLobbyId);

                if (lobbyToJoin != null) {
                    if(lobbyToJoin.getPlayers().size() >= lobbyToJoin.getMaxPlayers() && !lobbyToJoin.getPlayers().contains(playerId)) {
                        JSONObject fullResponse = new JSONObject();
                        fullResponse.put("type", "lobby");
                        fullResponse.put("subtype", "join_fail");
                        fullResponse.put("payload", new JSONObject().put("reason", "Lobby is full"));
                        sendToPlayer(playerId, fullResponse);
                        return;
                    }

                    lobbyToJoin.addPlayer(playerId);

                    if(lobbyToJoin.getPlayers().size() < lobbyToJoin.getMinPlayers()) {
                        lobbyToJoin.setStatus(LobbyStatus.WAITING_FOR_PLAYERS);
                    } else {
                        lobbyToJoin.setStatus(LobbyStatus.STARTING);
                    }

                    List<String> usernames = lobbyToJoin.getPlayers().stream()
                            .map(playerUsernames::get)
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
                    checkAndHandleCountdown(lobbyToJoin);
                    persistStateToKafka(lobbyToJoin);
                }
                break;

            case "leave":
                Long leaveLobbyId = json.getJSONObject("payload").getLong("lobbyId");
                Lobby lobbyToLeave = lobbies.get(leaveLobbyId);
                if (lobbyToLeave != null){
                    lobbyToLeave.getPlayers().remove(playerId);
                    if(lobbyToLeave.getPlayers().size() < lobbyToLeave.getMinPlayers()) {
                        lobbyToLeave.setStatus(LobbyStatus.WAITING_FOR_PLAYERS);
                    }

                    List<String> usernames = lobbyToLeave.getPlayers().stream()
                            .map(playerUsernames::get)
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
                    sendToPlayer(playerId, leaveResponse);
                    checkAndHandleCountdown(lobbyToLeave);
                    persistStateToKafka(lobbyToLeave);
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

                sendToPlayer(playerId, listResponse);
                break;
            default:
                System.out.println("Unknown lobby subtype: " + type);
                break;
        }
    }

    private void persistStateToKafka(Lobby lobby) {
        try {
            String lobbyJson = mapper.writeValueAsString(lobby);
            ProducerRecord<String, String> record = new ProducerRecord<>("lobby-state-store", lobby.getId().toString(), lobbyJson);
            this.kafkaProducer.send(record);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void deleteStateFromKafka(Long lobbyId) {
        ProducerRecord<String, String> record = new ProducerRecord<>("lobby-state-store", lobbyId.toString(), null);
        this.kafkaProducer.send(record);
    }

    private void restoreStateFromKafka() {
        System.out.println("Restaurando estado dos Lobbies do Kafka...");
        Properties props = new Properties();
        String kafkaServer = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        if (kafkaServer == null){
            kafkaServer = "localhost:9092";
        }

        props.put("bootstrap.servers", kafkaServer);
        props.put("group.id", "lobby-state-restorer-" + UUID.randomUUID());
        props.put("auto.offset.reset", "earliest");
        props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

        try (KafkaConsumer<String, String> restorer = new KafkaConsumer<>(props)) {
            restorer.subscribe(Collections.singletonList("lobby-state-store"));

            for (int i = 0; i < 5; i++) {
                ConsumerRecords<String, String> records = restorer.poll(Duration.ofMillis(500));
                for (ConsumerRecord<String, String> record : records) {
                    try {
                        Long lobbyId = Long.parseLong(record.key());
                        if (record.value() == null) {
                            lobbies.remove(lobbyId); // Foi deletado (Tombstone)
                        } else {
                            Lobby lobby = mapper.readValue(record.value(), Lobby.class);
                            lobbies.put(lobby.getId(), lobby);
                        }
                    } catch (Exception e) {
                        System.err.println("Erro ao restaurar lobby: " + e.getMessage());
                    }
                }
            }
        }
        System.out.println("Restauração concluída! " + lobbies.size() + " lobbies ativos na memória.");
    }

    private void startStateStoreConsumer() {
        System.out.println("Iniciando sincronização contínua de Lobbies (Replica Sync)...");
        Properties props = new Properties();
        String kafkaServer = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        if (kafkaServer == null) kafkaServer = "localhost:9092";

        props.put("bootstrap.servers", kafkaServer);
        props.put("group.id", "lobby-state-restorer-" + UUID.randomUUID());
        props.put("auto.offset.reset", "earliest");
        props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

        KafkaConsumer<String, String> restorer = new KafkaConsumer<>(props);
        restorer.subscribe(Collections.singletonList("lobby-state-store"));

        while (true) {
            ConsumerRecords<String, String> records = restorer.poll(Duration.ofMillis(200));
            for (ConsumerRecord<String, String> record : records) {
                try {
                    Long lobbyId = Long.parseLong(record.key());
                    if (record.value() == null) {
                        lobbies.remove(lobbyId);
                    } else {
                        Lobby parsedLobby = mapper.readValue(record.value(), Lobby.class);
                        Lobby existingLobby = lobbies.get(parsedLobby.getId());

                        if (existingLobby != null) {
                            existingLobby.setName(parsedLobby.getName());
                            existingLobby.setMaxPlayers(parsedLobby.getMaxPlayers());
                            existingLobby.setMinPlayers(parsedLobby.getMinPlayers());
                            existingLobby.setPlayers(parsedLobby.getPlayers());
                            existingLobby.setStatus(parsedLobby.getStatus());
                        } else {
                            lobbies.put(parsedLobby.getId(), parsedLobby);
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Erro ao sincronizar lobby: " + e.getMessage());
                }
            }
        }
    }
}