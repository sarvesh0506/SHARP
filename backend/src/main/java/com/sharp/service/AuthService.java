package com.sharp.service;

import com.sharp.dto.AuthRequest;
import com.sharp.dto.AuthResponse;
import com.sharp.dto.RegisterRequest;
import com.sharp.entity.Role;
import com.sharp.entity.User;
import com.sharp.exception.ApiException;
import com.sharp.repository.UserRepository;
import com.sharp.security.JwtTokenProvider;
import com.sharp.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuditService auditService;

    @Transactional
    public AuthResponse authenticate(AuthRequest request, String ipAddress) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ApiException("User record not found", HttpStatus.NOT_FOUND));

        auditService.record(user.getUsername(), "USER_LOGIN", "USER", user.getId().toString(), "User logged in successfully", ipAddress);

        return AuthResponse.builder()
                .token(jwt)
                .type("Bearer")
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .expiresIn(tokenProvider.getExpirationMs())
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, String ipAddress) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ApiException("Username is already taken!", HttpStatus.CONFLICT);
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ApiException("Email is already in use!", HttpStatus.CONFLICT);
        }

        Role role = Role.ROLE_OPERATOR;
        if (request.getRole() == Role.ROLE_ADMIN) {
            long existingAdmins = userRepository.countByRole(Role.ROLE_ADMIN);
            if (existingAdmins > 0) {
                throw new ApiException(
                        "Administrator self-registration is restricted. Public accounts are provisioned as OPERATOR.",
                        HttpStatus.FORBIDDEN
                );
            }
            // Allow initial administrator bootstrap only when no administrator exists in the system
            role = Role.ROLE_ADMIN;
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .enabled(true)
                .build();

        user = userRepository.save(user);

        auditService.record(user.getUsername(), "USER_REGISTERED", "USER", user.getId().toString(), "New user account created with role " + role, ipAddress);

        // Auto authenticate after registration
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        return AuthResponse.builder()
                .token(jwt)
                .type("Bearer")
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .expiresIn(tokenProvider.getExpirationMs())
                .build();
    }

    @Transactional(readOnly = true)
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ApiException("No authenticated user in session", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ApiException("Current user not found", HttpStatus.NOT_FOUND));
    }
}
