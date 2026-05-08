package org.br.heretoslay.match;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.br.heretoslay.auth.AuthService;
import org.br.heretoslay.entity.GameState;
import org.br.heretoslay.entity.Match;
import org.br.heretoslay.entity.PartyLeader;
import org.br.heretoslay.entity.Player;
import org.java_websocket.WebSocket;
import org.json.JSONObject;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static java.util.stream.Collectors.toList;

public class MatchService {

    private static final MatchService instance = new MatchService();
    private final Map<Long, Match> matches = new ConcurrentHashMap<>();

    private KafkaProducer<String, String> kafkaProducer;

    public static MatchService getInstance() {
        if(instance == null) {
            return new MatchService();
        }
        return instance;
    }

    public void startMatch(Long id, List<Player> players) {
        Match match = new Match(id, players);
        matches.put(id, match);
    }

    private MatchService() {
        initKafka();
    }


    private void initKafka() {
        Properties producerProps = new Properties();
        producerProps.put("bootstrap.servers", "localhost:9092");
        producerProps.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        producerProps.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        this.kafkaProducer = new KafkaProducer<>(producerProps);

        new Thread(this::startKafkaConsumer).start();
    }

    private void startKafkaConsumer() {
        Properties consumerProps = new Properties();
        consumerProps.put("bootstrap.servers", "localhost:9092");
        consumerProps.put("group.id", "heretoslay-engine");
        consumerProps.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        consumerProps.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

        KafkaConsumer<String, String> consumer = new KafkaConsumer<>(consumerProps);
        consumer.subscribe(Collections.singletonList("game-actions-in"));

        while (true) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
            for (ConsumerRecord<String, String> record : records) {
                JSONObject json = new JSONObject(record.value());
                handleKafkaMessage(json);
            }
        }
    }


    public void handleKafkaMessage(JSONObject json) {
        String type = json.getString("subtype");
        Long id = json.getLong("id");
        String playerId = json.getString("playerId");

        Match match = matches.get(id);
        if (match == null) return;

        switch (type) {
            case "get_match_state":
                JSONObject matchResponse = new JSONObject();
                matchResponse.put("type", "match");
                matchResponse.put("subtype", "match_state");
                matchResponse.put("payload", this.matches.get(id).getMatchState());
                publishToKafka(id, String.valueOf(matchResponse));
                break;
            case "order_selection":
                int roll = json.getJSONObject("payload").getInt("roll");
                match.processOrderSelectionRoll(playerId, roll);
                break;
            case "choose_party_leader":
                String chosenLeader = json.getJSONObject("payload").getString("party_leader");
                Match matchChoose = matches.get(id);
                boolean success = matchChoose.choosePartyLeader(playerId, chosenLeader);
                JSONObject response = new JSONObject();
                response.put("type", "match");
                response.put("subtype", "party_leader_chosen");
                response.put("payload", new JSONObject().put("success", success));
                publishToKafka(id, String.valueOf(response));
                break;
            case "action":
                String action = json.getString("action");
                Match matchAction = matches.get(id);
                matchAction.performAction(playerId, action, json);
                break;
            case "challenge":
                Match matchChallenge = matches.get(id);
                matchChallenge.challengeHero(playerId);
                break;


            case "get_selected_targets":
                Match matchTargets = matches.get(id);
                JSONObject targetsResponse = new JSONObject();
                targetsResponse.put("type", "match");
                targetsResponse.put("subtype", "select_effect_target");
                targetsResponse.put("payload", matchTargets.getSelectedTargets());
                publishToKafka(id, targetsResponse.toString());
                break;



            case "process_challenge_roll":
                roll = json.getJSONObject("payload").getInt("roll");
                match.processDuelRoll(playerId, roll);
                break;

            default:
                System.out.println("Unknown match subtype: " + type);
                break;
        }

    }

    public void publishToKafka(Long matchId, String message) {
        ProducerRecord<String, String> record = new ProducerRecord<>("game-state-out", matchId.toString(), message);
        this.kafkaProducer.send(record);
    }

    public void broadcastToMatch(Long matchId, String message) {
        Match match = matches.get(matchId);
        if (match != null) {
            match.broadcast(message);
        }
    }


    public List<String> getPlayerIdsInMatch(Long matchId) {
        return matches.get(matchId).getPlayers().values().stream()
                .map(p -> UUID.nameUUIDFromBytes(p.getUsername().getBytes()).toString())
                .toList();
    }
}
