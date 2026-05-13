package org.br.heretoslay.lobby;

public class LobbyApplication {
    public static void main(String[] args) {
        System.out.println("Iniciando o Microserviço de Lobbies...");
        LobbyService.getInstance();
        while (true) {
            try { Thread.sleep(10000); } catch (InterruptedException e) { e.printStackTrace(); }
        }
    }
}