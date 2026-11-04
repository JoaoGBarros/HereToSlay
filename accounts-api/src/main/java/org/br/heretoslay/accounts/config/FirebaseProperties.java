package org.br.heretoslay.accounts.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * The Firebase project whose ID tokens this API accepts. Only the project id is configured here;
 * the service account used to write custom claims comes from GOOGLE_APPLICATION_CREDENTIALS.
 */
@Validated
@ConfigurationProperties(prefix = "app.firebase")
public record FirebaseProperties(@NotBlank String projectId) {

    private static final String ISSUER_PREFIX = "https://securetoken.google.com/";

    public String issuer() {
        return ISSUER_PREFIX + projectId;
    }
}
