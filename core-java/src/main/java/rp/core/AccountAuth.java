package rp.core;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.*;
import java.time.Clock;
import java.util.*;

/**
 * Account authentication domain (Java 17+). No public HTTP endpoint is exposed here.
 * The caller MUST use a trusted HTTPS frontend with rate limiting and anti-abuse controls.
 */
public final class AccountAuth {
    public record Account(UUID id, String username, String encodedPassword) {}
    public interface Store {
        void create(Account a) throws Exception;
        Optional<Account> byUsername(String username) throws Exception;
        void saveSession(String tokenHash, UUID accountId, long expiresAtEpochSeconds) throws Exception;
        Optional<UUID> resolveSession(String tokenHash, long nowEpochSeconds) throws Exception;
        void deleteSession(String tokenHash) throws Exception;
    }
    public record Login(String token, UUID accountId, long expiresAtEpochSeconds) {}

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int ITERATIONS = 310_000;
    private static final int HASH_BYTES = 32;
    private static final long SESSION_LIFETIME_SECONDS = 12 * 60 * 60;
    private final Store store;
    private final Clock clock;

    public AccountAuth(Store store, Clock clock) {
        this.store = Objects.requireNonNull(store);
        this.clock = Objects.requireNonNull(clock);
    }

    private static byte[] randomBytes(int len) {
        byte[] b = new byte[len];
        RANDOM.nextBytes(b);
        return b;
    }
    private static byte[] pbkdf2(char[] password, byte[] salt, int iterations) {
        PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, HASH_BYTES * 8);
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (Exception e) {
            throw new IllegalStateException("Password hashing unavailable", e);
        } finally { spec.clearPassword(); }
    }
    private static String encodePassword(char[] password) {
        byte[] salt = randomBytes(16);
        byte[] hash = pbkdf2(password, salt, ITERATIONS);
        return "pbkdf2_sha256$" + ITERATIONS + "$" +
            Base64.getEncoder().encodeToString(salt) + "$" +
            Base64.getEncoder().encodeToString(hash);
    }
    private static boolean verifyPassword(char[] password, String encoded) {
        try {
            String[] parts = encoded.split("\\$", -1);
            if (parts.length != 4 || !parts[0].equals("pbkdf2_sha256")) return false;
            int iterations = Integer.parseInt(parts[1]);
            if (iterations < 100_000 || iterations > 1_000_000) return false;
            byte[] salt = Base64.getDecoder().decode(parts[2]);
            byte[] expected = Base64.getDecoder().decode(parts[3]);
            if (salt.length != 16 || expected.length != HASH_BYTES) return false;
            return MessageDigest.isEqual(expected, pbkdf2(password, salt, iterations));
        } catch (RuntimeException e) { return false; }
    }
    private static void checkUsername(String username) {
        if (username == null || !username.matches("[a-zA-Z0-9_]{3,32}"))
            throw new IllegalArgumentException("username must have 3–32 ASCII letters, numbers or underscores");
    }
    private static void checkPassword(char[] password) {
        if (password == null || password.length < 12 || password.length > 256)
            throw new IllegalArgumentException("password must have 12–256 characters");
    }
    private static String sha256Hex(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.US_ASCII));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
    public UUID register(String username, char[] password) throws Exception {
        checkUsername(username);
        checkPassword(password);
        try {
            UUID id = UUID.randomUUID();
            store.create(new Account(id, username.toLowerCase(Locale.ROOT), encodePassword(password)));
            return id;
        } finally { Arrays.fill(password, '\0'); }
    }
    public Optional<Login> login(String username, char[] password) throws Exception {
        checkUsername(username);
        Objects.requireNonNull(password);
        try {
            Optional<Account> found = store.byUsername(username.toLowerCase(Locale.ROOT));
            if (found.isEmpty() || !verifyPassword(password, found.get().encodedPassword()))
                return Optional.empty();
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes(32));
            long expires = clock.instant().getEpochSecond() + SESSION_LIFETIME_SECONDS;
            store.saveSession(sha256Hex(token), found.get().id(), expires);
            return Optional.of(new Login(token, found.get().id(), expires));
        } finally { Arrays.fill(password, '\0'); }
    }
    public Optional<UUID> authenticate(String token) throws Exception {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) return Optional.empty();
        return store.resolveSession(sha256Hex(token), clock.instant().getEpochSecond());
    }
    public void logout(String token) throws Exception {
        if (token != null && token.matches("[A-Za-z0-9_-]{43}"))
            store.deleteSession(sha256Hex(token));
    }

    /** PostgreSQL or MariaDB/MySQL JDBC implementation. The SQL schemas are in database/. */
    public static final class JdbcStore implements Store {
        private final DataSource ds;
        public JdbcStore(DataSource ds) { this.ds = Objects.requireNonNull(ds); }
        @Override public void create(Account a) throws SQLException {
            try (Connection c = ds.getConnection();
                 PreparedStatement q = c.prepareStatement("INSERT INTO accounts(id,username,password_hash) VALUES (?,?,?)")) {
                q.setString(1, a.id().toString());
                q.setString(2, a.username());
                q.setString(3, a.encodedPassword());
                q.executeUpdate();
            }
        }
        @Override public Optional<Account> byUsername(String username) throws SQLException {
            try (Connection c = ds.getConnection();
                 PreparedStatement q = c.prepareStatement("SELECT id,username,password_hash FROM accounts WHERE username=?")) {
                q.setString(1,username);
                try (ResultSet rs=q.executeQuery()) {
                    return rs.next()
                      ? Optional.of(new Account(UUID.fromString(rs.getString(1)),rs.getString(2),rs.getString(3)))
                      : Optional.empty();
                }
            }
        }
        @Override public void saveSession(String tokenHash, UUID accountId, long expiry) throws SQLException {
            try (Connection c=ds.getConnection();
                 PreparedStatement q=c.prepareStatement("INSERT INTO auth_sessions(token_hash,account_id,expires_at_epoch) VALUES (?,?,?)")) {
                q.setString(1,tokenHash);q.setString(2,accountId.toString());q.setLong(3,expiry);
                q.executeUpdate();
            }
        }
        @Override public Optional<UUID> resolveSession(String tokenHash,long now) throws SQLException {
            try (Connection c=ds.getConnection();
                 PreparedStatement q=c.prepareStatement("SELECT account_id FROM auth_sessions WHERE token_hash=? AND expires_at_epoch>?")) {
                q.setString(1,tokenHash);q.setLong(2,now);
                try (ResultSet rs=q.executeQuery()) {
                    return rs.next() ? Optional.of(UUID.fromString(rs.getString(1))) : Optional.empty();
                }
            }
        }
        @Override public void deleteSession(String tokenHash) throws SQLException {
            try (Connection c=ds.getConnection();
                 PreparedStatement q=c.prepareStatement("DELETE FROM auth_sessions WHERE token_hash=?")) {
                q.setString(1,tokenHash);q.executeUpdate();
            }
        }
    }
}
