package org.br.heretoslay.match;

import com.fasterxml.jackson.databind.ObjectMapper;
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

    private ObjectMapper mapper;

    public static MatchService getInstance() {
        if(instance == null) {
            return new MatchService();
        }
        return instance;
    }

    public void startMatch(Long id, List<Player> players) {
        this.mapper = new ObjectMapper();
        Match match = new Match(id, players);
        matches.put(id, match);
        persistStateToKafka(match);
    }

    private MatchService() {
        this.mapper = new ObjectMapper();
        initKafka();
        restoreStateFromKafka();
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

    private void persistStateToKafka(Match match) {
        try {
            String matchJson = mapper.writeValueAsString(match);
            ProducerRecord<String, String> record = new ProducerRecord<>("match-state-store", match.getMatchId().toString(), matchJson);
            this.kafkaProducer.send(record);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void restoreStateFromKafka() {
        System.out.println("Restaurando estado das partidas do Kafka...");
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("group.id", "state-restorer-" + UUID.randomUUID());
        props.put("auto.offset.reset", "earliest");
        props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

        try (KafkaConsumer<String, String> restorer = new KafkaConsumer<>(props)) {
            restorer.subscribe(Collections.singletonList("match-state-store"));

            for (int i = 0; i < 5; i++) {
                ConsumerRecords<String, String> records = restorer.poll(Duration.ofMillis(500));
                for (ConsumerRecord<String, String> record : records) {
                    try {
                        Match match = mapper.readValue(record.value(), Match.class);
                        matches.put(match.getMatchId(), match);
                    } catch (Exception e) {
                        System.err.println("Erro ao restaurar partida: " + e.getMessage());
                    }
                }
            }
        }
        System.out.println("Restauração concluída! " + matches.size() + " partidas na memória.");
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


    public List<String> getPlayerIdsInMatch(Long matchId) {
        Match match = matches.get(matchId);
        if (match != null) {
            return new ArrayList<>(match.getPlayers().keySet());
        }
        return Collections.emptyList();
    }
}
