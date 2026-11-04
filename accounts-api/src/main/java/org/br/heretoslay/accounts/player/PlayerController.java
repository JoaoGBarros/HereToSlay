package org.br.heretoslay.accounts.player;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import org.br.heretoslay.accounts.common.ApiResponse;
import org.br.heretoslay.accounts.common.PageResponse;
import org.br.heretoslay.accounts.firebase.FirebaseClaimsClient;
import org.br.heretoslay.accounts.match.MatchService;
import org.br.heretoslay.accounts.match.dto.MatchSummaryResponse;
import org.br.heretoslay.accounts.player.dto.CreatePlayerRequest;
import org.br.heretoslay.accounts.player.dto.PlayerResponse;
import org.br.heretoslay.accounts.player.dto.RecordLoginRequest;
import org.br.heretoslay.accounts.player.dto.UsernameAvailabilityResponse;
import org.br.heretoslay.accounts.player.dto.UsernameRules;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class PlayerController {

    private static final int MAX_PAGE_SIZE = 50;

    private final PlayerService playerService;
    private final MatchService matchService;

    public PlayerController(PlayerService playerService, MatchService matchService) {
        this.playerService = playerService;
        this.matchService = matchService;
    }

    @PostMapping("/players")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PlayerResponse> register(@AuthenticationPrincipal Jwt token,
                                                @Valid @RequestBody CreatePlayerRequest request) {
        return ApiResponse.ok(playerService.register(token.getSubject(), request));
    }

    @GetMapping("/players/me")
    public ApiResponse<PlayerResponse> me(@AuthenticationPrincipal Jwt token) {
        return ApiResponse.ok(playerService.getOwnProfile(token.getSubject()));
    }

    @PostMapping("/players/me/logins")
    public ApiResponse<PlayerResponse> recordLogin(@AuthenticationPrincipal Jwt token,
                                                   @Valid @RequestBody RecordLoginRequest request) {
        String usernameClaim = token.getClaimAsString(FirebaseClaimsClient.USERNAME_CLAIM);
        return ApiResponse.ok(playerService.recordLogin(token.getSubject(), usernameClaim, request.platform()));
    }

    @GetMapping("/players/{username}")
    public ApiResponse<PlayerResponse> byUsername(@PathVariable @Pattern(regexp = UsernameRules.PATTERN) String username) {
        return ApiResponse.ok(playerService.getByUsername(username));
    }

    @GetMapping("/players/{username}/matches")
    public ApiResponse<PageResponse<MatchSummaryResponse>> matches(
            @PathVariable @Pattern(regexp = UsernameRules.PATTERN) String username,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int size) {
        Player player = playerService.getEntityByUsername(username);
        return ApiResponse.ok(matchService.historyOf(player, page, size));
    }

    @GetMapping("/usernames/{username}/availability")
    public ApiResponse<UsernameAvailabilityResponse> availability(
            @PathVariable @Pattern(regexp = UsernameRules.PATTERN) String username) {
        return ApiResponse.ok(new UsernameAvailabilityResponse(username, playerService.isUsernameAvailable(username)));
    }
}
