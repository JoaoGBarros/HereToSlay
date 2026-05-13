# Here to Slay

Este é um projeto de um jogo de cartas chamado "Here to Slay", desenvolvido com um frontend em React e um backend em Java.

## Tecnologias Utilizadas

### Frontend
- **React**: Biblioteca para construção da interface de usuário.
- **Vite**: Ferramenta de build para o desenvolvimento frontend.
- **Electron**: Framework para criar aplicativos desktop com tecnologias web.
- **TypeScript**: Superset do JavaScript que adiciona tipagem estática.
- **Tailwind CSS**: Framework de CSS para estilização.
- **React Router**: Para gerenciamento de rotas na aplicação.
- **WebSocket**: Para comunicação em tempo real com o backend.

### Backend
- **Java 21**: Linguagem de programação principal.
- **Maven**: Ferramenta para gerenciamento de dependências e build do projeto.
- **Java-WebSocket**: Para implementação do servidor WebSocket.
- **Kafka**: Plataforma de streaming de eventos para comunicação entre os microsserviços.
- **Docker**: Para containerização dos serviços de backend.

## Arquitetura

A aplicação segue uma arquitetura de microsserviços no backend e um aplicativo desktop no frontend, com Nginx atuando como um reverse proxy e load balancer.

```
+--------------------------------------------------------------------------+
|                                                                          |
|                        Frontend (Electron + React)                         |
|                                                                          |
+--------------------------------------------------------------------------+
       |                                      ^
       | (WebSocket)                          | (WebSocket)
       v                                      |
+--------------------------------------------------------------------------+
|                                 Nginx                                    |
+--------------------------------------------------------------------------+
       |                           ^
       | (WebSocket)               | (WebSocket)
       v                           |
+--------------------------------------------------------------------------------------------------+
|                                          Backend (Java)                                          |
|                                                                                                  |
|  +-----------------+      +-----------------+      +------------------+      +------------------+  |
|  |    Gateway 1    |      |     Lobby 1     |      |     Engine 1     |      |     Engine 2     |  |
|  +-----------------+      +-----------------+      +------------------+      +------------------+  |
|  +-----------------+      +-----------------+      +------------------+      +------------------+  |
|  |    Gateway 2    |      |     Lobby 2     |      |     Engine 3     |      |       ...        |  |
|  +-----------------+      +-----------------+      +------------------+      +------------------+  |
|         ...                      ...                      ...                       ...          |
|                                                                                                  |
|         ^  |                   ^  |                    ^  |                    ^  |             |
|         |  v                   |  v                    |  v                    |  v             |
|  +-------------------------------------------------------------------------------------------+  |
|  |                                                                                           |  |
|  |                                           Kafka                                           |  |
|  |                                                                                           |  |
|  +-------------------------------------------------------------------------------------------+  |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
```

- **Frontend**: É um aplicativo desktop construído com Electron, que encapsula uma aplicação web feita em React. A comunicação com o backend é feita através de WebSockets.
- **Nginx**: Atua como um reverse proxy, recebendo todas as conexões WebSocket do frontend e distribuindo-as entre as instâncias do microsserviço **Gateway**. Isso permite o balanceamento de carga e a escalabilidade horizontal do ponto de entrada.
- **Backend**: É composto por três principais microsserviços:
    - **Gateway**: Ponto de entrada para as conexões WebSocket dos clientes. Atua como um roteador de mensagens para os outros serviços. Múltiplas instâncias podem ser executadas para alta disponibilidade e escalabilidade.
    - **Lobby**: Gerencia a criação e o estado das salas de jogo antes do início da partida. Pode ser escalado para suportar um grande número de lobbies simultâneos.
    - **Engine**: Controla a lógica do jogo (regras, turnos, cartas, etc.) uma vez que a partida começa. Cada instância do Engine pode ser responsável por uma ou mais partidas, permitindo escalar a capacidade de jogos em andamento.
- **Comunicação**: Os microsserviços do backend se comunicam de forma assíncrona através de tópicos no Kafka, o que garante o desacoplamento e a resiliência do sistema.

## Como Rodar o Projeto

### Pré-requisitos
- Node.js e npm
- Java 21 ou superior
- Maven
- Docker

### Backend
1.  **Navegue até a pasta do backend:**
    ```bash
    cd backend
    ```
2.  **Compile o projeto com Maven:**
    ```bash
    mvn clean install
    ```
3.  **Inicie os containers do Kafka e dos serviços com Docker Compose:**
    ```bash
    docker-compose up --build
    ```

### Frontend
1.  **Navegue até a raiz do projeto.**
2.  **Instale as dependências do Node.js:**
    ```bash
    npm install
    ```
3.  **Inicie a aplicação em modo de desenvolvimento:**
    ```bash
    npm run dev
    ```

Isso iniciará a aplicação Electron e a interface do usuário em modo de desenvolvimento com hot-reload.
