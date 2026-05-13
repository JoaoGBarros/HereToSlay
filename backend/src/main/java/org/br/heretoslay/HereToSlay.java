package org.br.heretoslay;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.br.heretoslay.auth.AuthService;
import org.br.heretoslay.entity.Player;
import org.br.heretoslay.lobby.LobbyService;
import org.br.heretoslay.match.MatchService;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONObject;

import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Properties;

public class HereToSlay extends WebSocketServer {

    private final AuthService authService = AuthService.getInstance();
    private final LobbyService lobbyService = LobbyService.getInstance();
    private final MatchService matchService = MatchService.getInstance();
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
        JSONObject obj = new JSONObject(message);
        String type = obj.getString("type");
        switch (type) {
            case "auth":
                authService.handleMessage(conn, obj);
                break;
            case "lobby":
                lobbyService.handleMessage(conn, obj);
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
        this.producer = new KafkaProducer<>(producerProps);

        new Thread(this::startKafkaConsumer).start();
    }

    private void startKafkaConsumer() {
        Properties consumerProps = new Properties();
        String kafkaServer = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        if (kafkaServer == null) {
            kafkaServer = "localhost:9092";
        }
        consumerProps.put("bootstrap.servers", kafkaServer);
        consumerProps.put("group.id", "heretoslay-gateway");
        consumerProps.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(consumerProps);
        consumer.subscribe(Collections.singletonList("game-state-out"));

        while (true) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
            for (ConsumerRecord<String, String> record : records) {
                Long matchId = Long.parseLong(record.key());
                String message = record.value();
                broadcastToMatch(matchId, message);
            }
        }
    }

    private void broadcastToMatch(Long matchId, String message) {
        List<String> playerIds = matchService.getPlayerIdsInMatch(matchId);

        for (String playerId : playerIds) {
            WebSocket conn = authService.getConnectionByPlayerId(playerId);

            if (conn != null && conn.isOpen()) {
                conn.send(message);
            } else {
                System.out.println("Aviso: Jogador " + playerId + " não encontrado ou desconectado.");
            }
        }
    }

    public void sendToKafka(String topic, String key, String value) {
        try {
            ProducerRecord<String, String> record = new ProducerRecord<>(topic, key, value);
            this.producer.send(record);
        } catch (Exception e) {
            System.err.println("Erro ao enviar mensagem para o Kafka: " + e.getMessage());
        }
    }
}