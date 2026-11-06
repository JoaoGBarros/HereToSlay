package org.br.heretoslay.auth;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import com.nimbusds.jose.proc.BadJOSEException;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTClaimsVerifier;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;

import java.net.MalformedURLException;
import java.net.URI;
import java.text.ParseException;
import java.util.Optional;
import java.util.Set;

/**
 * Checks Firebase ID tokens: signed by Google (keys fetched and cached from Google's JWK set),
 * issued for this Firebase project, not expired. Needs only the public project id, no secret.
 */
public final class FirebaseTokenVerifier {

    private static final String JWK_SET_URL =
            "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
    private static final String ISSUER_PREFIX = "https://securetoken.google.com/";
    private static final String USERNAME_CLAIM = "username";

    /** A valid token. The username is null until the player has created their profile. */
    public record VerifiedToken(String uid, String username) {
        public boolean hasProfile() {
            return username != null && !username.isBlank();
        }
    }

    private final ConfigurableJWTProcessor<SecurityContext> processor;

    public FirebaseTokenVerifier(String projectId) {
        if (projectId == null || projectId.isBlank()) {
            throw new IllegalStateException("FIREBASE_PROJECT_ID must be set");
        }
        JWKSource<SecurityContext> keys;
        try {
            keys = JWKSourceBuilder.create(URI.create(JWK_SET_URL).toURL()).retrying(true).build();
        } catch (MalformedURLException e) {
            throw new IllegalStateException("Bad Firebase key URL", e);
        }
        processor = new DefaultJWTProcessor<>();
        processor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keys));
        processor.setJWTClaimsSetVerifier(new DefaultJWTClaimsVerifier<>(
                projectId,
                new JWTClaimsSet.Builder().issuer(ISSUER_PREFIX + projectId).build(),
                Set.of("sub", "exp", "iat")));
    }

    /** The token's account, or empty if the token is malformed, forged, expired or for another project. */
    public Optional<VerifiedToken> verify(String idToken) {
        if (idToken == null || idToken.isBlank()) return Optional.empty();
        try {
            JWTClaimsSet claims = processor.process(idToken, null);
            String uid = claims.getSubject();
            if (uid == null || uid.isBlank()) return Optional.empty();
            return Optional.of(new VerifiedToken(uid, claims.getStringClaim(USERNAME_CLAIM)));
        } catch (ParseException | BadJOSEException | JOSEException e) {
            return Optional.empty();
        }
    }
}
