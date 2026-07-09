package org.br.heretoslay;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.br.heretoslay.auth.AuthService;
import org.br.heretoslay.entity.Player;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONArray;
import org.json.JSONObject;

import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class HereToSlay extends WebSocketServer {

    private final AuthService authService = AuthService.getInstance();
    private final Map<String, java.util.Set<String>> matchRosterCache = new ConcurrentHashMap<>();
    private final Map<String, List<String>> pendingAlerts = new ConcurrentHashMap<>();
    private KafkaProducer<String, String> producer;
    private static HereToSlay instance;



    public HereToSlay(int port) {
        super(new InetSocketAddress(port));
        initKafka();
        instance = this;
    }

    public static void main(String[] args) {
        int port = 8887;
        HereToSlay server = new HereToSlay(port);
        server.start();
    }

    public static HereToSlay getInstance() {
        return instance;
    }



    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("onOpen");
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        System.out.println("onClose");
    }

    @Override
    public void onMessage(WebSocket conn, String message) {

        // TODO: para debugar retirar depois
        System.out.println(" VVV [WebSocket] Recebi do navegador: " + message);

        JSONObject obj = new JSONObject(message);
        String type = obj.getString("type");
        switch (type) {
            case "auth":
                authService.handleMessage(conn, obj);
                break;
            case "lobby":
                try {
                    Player pLobby = authService.getPlayerByConnection(conn);
                    if (pLobby == null) return;
                    obj.put("playerId", pLobby.getId().toString());
                    obj.put("username", pLobby.getUsername());
                    String routingKey = obj.has("payload") && obj.getJSONObject("payload").has("lobbyId")
                            ? String.valueOf(obj.getJSONObject("payload").getLong("lobbyId"))
                            : pLobby.getId().toString();
                    ProducerRecord<String, String> lobbyRecord = new ProducerRecord<>("lobby-actions-in", routingKey, obj.toString());
                    producer.send(lobbyRecord);
                } catch (Exception e) {
                    System.err.println("Erro ao obter player para lobby: " + e.getMessage());
                }
                break;

            case "match":
                try {
                    Player p = authService.getPlayerByConnection(conn);
                    if (p == null) return;
                    obj.put("playerId", p.getId().toString());
                    ProducerRecord<String, String> record = new ProducerRecord<>("game-actions-in", obj.get("id").toString(), obj.toString());
                    producer.send(record);
                } catch (Exception e) {
                    System.err.println("Erro ao encaminhar para o Kafka: " + e.getMessage());
                }
                break;

        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        ex.printStackTrace();
    }

    @Override
    public void onStart() {
        System.out.println("onStart");
    }

    private void initKafka() {
        Properties producerProps = new Properties();
        String kafkaServer = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        if (kafkaServer == null) {
            kafkaServer = "localhost:9092";
        }
        producerProps.put("bootstrap.servers", kafkaServer);
        producerProps.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put("acks", "all");  // Aguarda todas as replicas ISR confirmarem
        this.producer = new KafkaProducer<>(producerProps);

        new Thread(this::startKafkaConsumer).start();
    }

    private void startKafkaConsumer() {

        // TODO: para debugar retirar depois
        System.out.println(" ^^^ [WebSocket] Devolvendo novo estado para os jogadores via WebSocket!");

        Properties consumerProps = new Properties();
        String kafkaServer = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        if (kafkaServer == null) {
            kafkaServer = "localhost:9092";
        }
        consumerProps.put("bootstrap.servers", kafkaServer);
        consumerProps.put("group.id", "heretoslay-gateway-" + java.util.UUID.randomUUID().toString());
        consumerProps.put("auto.offset.reset", "earliest");
        consumerProps.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(consumerProps);
        consumer.subscribe(Arrays.asList("game-state-out", "lobby-state-out", "game-monitoring-alerts", "match-state-store"));

        while (true) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));

            for (ConsumerRecord<String, String> record : records) {
                if (record.topic().equals("match-state-store")) {
                    updateMatchRosterCache(record.key(), record.value());
                }
            }

            if (!pendingAlerts.isEmpty()) {
                retryPendingAlerts();
            }

            for (ConsumerRecord<String, String> record : records) {
                String topic = record.topic();
                String message = record.value();

                if (topic.equals("game-state-out")) {
                    JSONObject msgJson = new JSONObject(message);
                    JSONArray targetPlayers = msgJson.getJSONArray("targetPlayers");
                    String payload = msgJson.getJSONObject("payload").toString();
                    for (int i = 0; i < targetPlayers.length(); i++) {
                        WebSocket conn = authService.getConnectionByPlayerId(targetPlayers.getString(i));
                        if (conn != null && conn.isOpen()) {
                            conn.send(payload);
                        }
                    }

                } else if (topic.equals("lobby-state-out")) {
                    handleLobbyStateOut(message);
                } else if (topic.equals("game-monitoring-alerts")) {
                    handleMonitoringAlert(record.key(), message);
                }
            }
        }
    }

    private void updateMatchRosterCache(String matchId, String matchJson) {
        if (matchId == null || matchJson == null) return;
        try {
            JSONObject match = new JSONObject(matchJson);
            JSONObject players = match.optJSONObject("players");
            if (players != null) {
                matchRosterCache.put(matchId, new java.util.HashSet<>(players.keySet()));
            }
        } catch (Exception e) {
            System.err.println("Erro ao atualizar cache de roster da partida " + matchId + ": " + e.getMessage());
        }
    }

    private void handleMonitoringAlert(String matchId, String message) {
        JSONObject msgJson = new JSONObject(message);
        JSONArray targetPlayers = msgJson.getJSONArray("targetPlayers");
        String payload = msgJson.getJSONObject("payload").toString();

        java.util.Set<String> resolvedTargets;
        if (targetPlayers.length() == 1 && "MATCH_ALL".equals(targetPlayers.getString(0))) {
            resolvedTargets = matchRosterCache.getOrDefault(matchId, java.util.Collections.emptySet());
            if (resolvedTargets.isEmpty()) {
                pendingAlerts.computeIfAbsent(matchId, k -> new ArrayList<>()).add(message);
                return;
            }
        } else {
            resolvedTargets = new java.util.HashSet<>();
            for (int i = 0; i < targetPlayers.length(); i++) {
                resolvedTargets.add(targetPlayers.getString(i));
            }
        }

        System.out.println(" ^^^ [WebSocket] Enviando alerta de monitoramento para os jogadores via WebSocket: " + payload);

        for (String playerId : resolvedTargets) {
            WebSocket conn = authService.getConnectionByPlayerId(playerId);
            System.out.println(" ^^^ [WebSocket] Tentando enviar alerta para jogador " + playerId);
            if (conn != null && conn.isOpen()) {
                conn.send(payload);
                System.out.println(" ^^^ [WebSocket] Alerta enviado para jogador " + playerId);
            }
        }
    }

    private void retryPendingAlerts() {
        Iterator<Map.Entry<String, List<String>>> iter = pendingAlerts.entrySet().iterator();
        while (iter.hasNext()) {
            Map.Entry<String, List<String>> entry = iter.next();
            if (matchRosterCache.containsKey(entry.getKey())) {
                for (String message : entry.getValue()) {
                    handleMonitoringAlert(entry.getKey(), message);
                }
                iter.remove();
            }
        }
    }

    private void handleLobbyStateOut(String message) {
        JSONObject msgJson = new JSONObject(message);
        JSONArray targetPlayers = msgJson.getJSONArray("targetPlayers");
        String payload = msgJson.getJSONObject("payload").toString();

        if (!targetPlayers.isEmpty() && targetPlayers.getString(0).equals("ALL")) {
            for (WebSocket conn : getConnections()) {
                if (authService.getPlayerByConnection(conn) != null) {
                    conn.send(payload);
                }
            }
        } else {
            for (int i = 0; i < targetPlayers.length(); i++) {
                WebSocket conn = authService.getConnectionByPlayerId(targetPlayers.getString(i));
                if (conn != null && conn.isOpen()) {
                    conn.send(payload);
                }
            }
        }
    }
}