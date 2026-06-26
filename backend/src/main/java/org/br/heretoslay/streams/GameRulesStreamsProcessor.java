package org.br.heretoslay.streams;

import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.StreamsConfig;
import org.apache.kafka.streams.Topology;
import org.apache.kafka.streams.kstream.KStream;
import org.apache.kafka.streams.kstream.Consumed;
import org.apache.kafka.streams.kstream.Produced;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Properties;

public class GameRulesStreamsProcessor {

    public static void main(String[] args) {
        // Configurações do ambiente de Streams
        Properties config = new Properties();
        config.put(StreamsConfig.APPLICATION_ID_CONFIG, "heretoslay-rules-engine");

        String kafkaServer = System.getenv("KAFKA_BOOTSTRAP_SERVERS");
        config.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, kafkaServer != null ? kafkaServer : "localhost:9092");

        // Configurando para que as chaves e valores trafegem como String (JSON) por padrão
        config.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().getClass().getName());
        config.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.String().getClass().getName());

        // Diminuindo a latencia para usar a tabela
        config.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 10);

        // TODO: criar uma KTable para armazenar as infos de rolldice e chelleges


        StreamsBuilder builder = new StreamsBuilder();

        // Cria a Stream de entrada lendo o que o WebSocket postou
        KStream<String, String> inputActions = builder.stream("game-actions-in");

        // TODO: Debug, remover depois
        inputActions.peek((key, value) -> {
            // mensagem para debug
            System.out.println(" ** [Kafka Streams] Recebendo ação do player: " + value);
        });

        KStream<String, String> outputStates = inputActions
                // Filtra apenas mensagens válidas para evitar quebras, se a msg quebrar o jogo não para, só ignora a msg quebrada
                .filter((key, value) -> {
                    try {
                        JSONObject obj = new JSONObject(value);
                        return obj.has("type") && "match".equals(obj.getString("type"));
                    } catch (Exception e) {
                        return false; // Ignora o evento se o JSON for inválido
                    }
                })

                // LAMBDA 2: Transforma a ação recebida no novo estado do jogo, ele pega o JSON bruto e separa em regras que o motor entende
                .mapValues(value -> {
                    JSONObject actionEvent = new JSONObject(value);
                    String playerId = actionEvent.getString("playerId");

                    // TODO: para debugar retirar depois
                    System.out.println(" ** [Kafka Streams] Processando regras para o player: " + playerId);

                    // Se o player mandou um ataque, o modificador deve ser processado aqui
                    JSONObject gameStatePayload = new JSONObject();
                    gameStatePayload.put("type", "match_update");
                    gameStatePayload.put("status", "SUCCESS");
                    gameStatePayload.put("lastActor", playerId);
                    // mensagem para debug
                    gameStatePayload.put("message", "Ação processada via Kafka Streams!");

                    // Monta a estrutura exata que startKafkaConsumer espera ler:
                    JSONObject finalResponse = new JSONObject();

                    // targetPlayers define quem vai receber via WebSocket
                    JSONArray targetPlayers = new JSONArray();
                    targetPlayers.put(playerId); // Envia de volta para quem jogou (ou mapeia os oponentes aqui, se necessário)

                    finalResponse.put("targetPlayers", targetPlayers);
                    finalResponse.put("payload", gameStatePayload);

                    return finalResponse.toString();
                });

        // Direciona o fluxo processado para o tópico de saída que o Gateway escuta
        outputStates.to("game-state-out");
        // TODO: Debug, remover depois
        outputStates.peek((key, value) -> {
            // mensagem para debug
            System.out.println(" ** [Kafka Streams] Enviando estado do jogo para o tópico 'game-state-out': " + value);
        });

        // Inicia o motor de execução do Kafka Streams
        Topology topology = builder.build();
        try {
            KafkaStreams streams = new KafkaStreams(topology, config);
            streams.start();

            // mensagem para saber se está rodando sem problemas
            System.out.println("Motor de Regras do Here to Slay (Kafka Streams) iniciado!");

            // Garante o fechamento limpo ao encerrar o programa
            Runtime.getRuntime().addShutdownHook(new Thread(streams::close));

        } catch (Exception e) {
            System.err.println("Erro ao Iniciar o motor do kafkaStream:" + e.getMessage());
        }
    }
}