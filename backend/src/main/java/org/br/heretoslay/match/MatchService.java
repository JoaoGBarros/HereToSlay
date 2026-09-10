package org.br.heretoslay.match;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.br.heretoslay.entity.Match;
import org.br.heretoslay.entity.Player;
import org.json.JSONArray;
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
        publishRoster(match);
        match.publishState();
    }

    /** The gateways learn who is in each match from this topic, to deliver match-wide monitoring alerts. */
    private void publishRoster(Match match) {
        JSONObject players = new JSONObject();
        match.getPlayers().forEach((playerId, p) -> players.put(playerId, new JSONObject().put("username", p.getUsername())));
        JSONObject roster = new JSONObject().put("matchId", match.getMatchId()).put("players", players);
        this.kafkaProducer.send(new ProducerRecord<>("match-state-store", match.getMatchId().toString(), roster.toString()));
    }

    private MatchService() {
        initKafka();
        new Thread(this::startKafkaConsumer).start();
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
        this.kafkaProducer = new KafkaProducer<>(producerProps);

        new Thread(this::startKafkaConsumer).start();
    }

    private void startKafkaConsumer() {
        Properties consumerProps = new Properties();
        String kafkaServer = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        if (kafkaServer == null) {
            kafkaServer = "localhost:9092";
        }
        consumerProps.put("bootstrap.servers", kafkaServer);
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

        if(type.equals("start_match")){
            List<Player> startingPlayers = new ArrayList<>();
            JSONArray playersArray = json.getJSONArray("players");
            for (int i = 0; i < playersArray.length(); i++) {
                JSONObject pJson = playersArray.getJSONObject(i);
                Player p = new Player();
                p.setId(UUID.fromString(pJson.getString("id")));
                p.setUsername(pJson.getString("username"));
                startingPlayers.add(p);
            }
            startMatch(id, startingPlayers);
            return;
        }

        String playerId = json.getString("playerId");

        Match match = matches.get(id);
        if (match == null) return;
        switch (type) {
            case "get_match_state":
                match.publishState();
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
            case "process_challenge_roll":
                roll = json.getJSONObject("payload").getInt("roll");
                match.processDuelRoll(playerId, roll);
                break;

            case "chat":
                JSONObject chatPayload = json.optJSONObject("payload");
                match.handleChat(playerId, chatPayload == null ? "" : chatPayload.optString("text", ""));
                break;

            case "get_chat_history":
                match.publishChatHistory();
                break;

            case "process_monster_roll":
                roll = json.getJSONObject("payload").getInt("roll");
                match.processMonsterRoll(playerId, roll);
                break;

            default:
                System.out.println("Unknown match subtype: " + type);
                break;
        }

    }

    public void publishToKafka(Long matchId, String message) {
        List<String> targetIds = getPlayerIdsInMatch(matchId);
        JSONObject wrapper = new JSONObject();
        wrapper.put("targetPlayers", new JSONArray(targetIds));
        wrapper.put("payload", new JSONObject(message));
        ProducerRecord<String, String> record = new ProducerRecord<>("game-state-out", matchId.toString(), wrapper.toString());
        this.kafkaProducer.send(record);
    }


    /** Sends a message only to the given players of a match (private views such as hands). */
    public void publishToPlayers(Long matchId, List<String> targetIds, String message) {
        JSONObject wrapper = new JSONObject();
        wrapper.put("targetPlayers", new JSONArray(targetIds));
        wrapper.put("payload", new JSONObject(message));
        this.kafkaProducer.send(new ProducerRecord<>("game-state-out", matchId.toString(), wrapper.toString()));
    }

    public List<String> getPlayerIdsInMatch(Long matchId) {
        Match match = matches.get(matchId);
        if (match != null) {
            return new ArrayList<>(match.getPlayers().keySet());
        }
        return Collections.emptyList();
    }
}
