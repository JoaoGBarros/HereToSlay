package org.br.heretoslay.accounts;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Player accounts, statistics and match history for HtS Online. Players sign in with Firebase;
 * this service keeps their profile and stats, and records every finished match the game engine
 * reports on Kafka.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class AccountsApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(AccountsApiApplication.class, args);
    }
}
