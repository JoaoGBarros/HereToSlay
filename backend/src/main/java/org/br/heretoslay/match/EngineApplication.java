package org.br.heretoslay.match;

public class EngineApplication {
    public static void main(String[] args) {
        System.out.println("Iniciando a Game Engine de Here To Slay...");

        MatchService.getInstance();

        System.out.println("Engine conectada ao Kafka! Aguardando partidas...");

        while (true) {
            try {
                Thread.sleep(10000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}