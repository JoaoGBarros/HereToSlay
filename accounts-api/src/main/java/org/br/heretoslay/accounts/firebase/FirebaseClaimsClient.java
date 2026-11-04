package org.br.heretoslay.accounts.firebase;

import com.google.auth.oauth2.GoogleCredentials;
import org.br.heretoslay.accounts.common.exception.ExternalServiceException;
import org.br.heretoslay.accounts.config.FirebaseProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.util.Map;

/**
 * Writes the player's username into their Firebase account as a custom claim. Only this server
 * (holding the project's service account) can set custom claims, so the game gateway can trust the
 * username it reads from an ID token without asking this API.
 *
 * <p>The service account is read from GOOGLE_APPLICATION_CREDENTIALS at startup; the API refuses to
 * start without it.
 */
@Component
public class FirebaseClaimsClient {

    private static final String SCOPE = "https://www.googleapis.com/auth/identitytoolkit";
    private static final String UPDATE_ACCOUNT_URL =
            "https://identitytoolkit.googleapis.com/v1/projects/{projectId}/accounts:update";
    public static final String USERNAME_CLAIM = "username";

    private final RestClient restClient;
    private final FirebaseProperties firebase;
    private final JsonMapper jsonMapper;
    private final GoogleCredentials credentials;

    public FirebaseClaimsClient(FirebaseProperties firebase, JsonMapper jsonMapper) throws IOException {
        this.restClient = RestClient.create();
        this.firebase = firebase;
        this.jsonMapper = jsonMapper;
        this.credentials = GoogleCredentials.getApplicationDefault().createScoped(SCOPE);
    }

    public void setUsernameClaim(String firebaseUid, String username) {
        try {
            credentials.refreshIfExpired();
            String claims = jsonMapper.writeValueAsString(Map.of(USERNAME_CLAIM, username));
            restClient.post()
                    .uri(UPDATE_ACCOUNT_URL, firebase.projectId())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + credentials.getAccessToken().getTokenValue())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("localId", firebaseUid, "customAttributes", claims))
                    .retrieve()
                    .toBodilessEntity();
        } catch (IOException | RestClientException ex) {
            throw new ExternalServiceException("Could not set the username claim on a Firebase account", ex);
        }
    }
}
