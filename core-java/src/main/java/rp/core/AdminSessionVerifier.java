package rp.core;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Optional;
import java.util.UUID;

/**
 * Trusted local command: resolve an existing LifeAccount session and community permission.
 * Token is read via stdin, never command arguments or environment.
 * Output contains only ALLOW / DENY; no credentials or account details.
 */
public final class AdminSessionVerifier {
    private AdminSessionVerifier() {}
    static boolean allowed(AccountAuth auth, CommunityJdbc communities, UUID community, String token) throws Exception {
        Optional<UUID> account = auth.authenticate(token);
        return account.isPresent() && communities.hasStaffPermission(community, account.get(), "ADMIN_VIEW");
    }
    public static void main(String[] args) {
        try {
            if (args.length != 0) throw new IllegalArgumentException("no arguments");
            String url = required("LIFE_JDBC_URL");
            String user = required("LIFE_JDBC_USER");
            String password = required("LIFE_JDBC_PASSWORD");
            UUID community = UUID.fromString(required("LIFE_ADMIN_COMMUNITY_ID"));
            try (BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.US_ASCII))) {
                String token = in.readLine();
                if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) {
                    System.out.println("DENY");
                    return;
                }
                DriverManagerDataSource ds = new DriverManagerDataSource(url,user,password);
                AccountAuth auth = new AccountAuth(new AccountAuth.JdbcStore(ds), Clock.systemUTC());
                CommunityJdbc access = new CommunityJdbc(ds);
                System.out.println(allowed(auth, access, community, token) ? "ALLOW" : "DENY");
            }
        } catch (Exception e) {
            // Fail closed, never leak database connection strings or SQL details.
            System.out.println("DENY");
            System.exit(1);
        }
    }
    private static String required(String name) {
        String v = System.getenv(name);
        if (v == null || v.isBlank()) throw new IllegalArgumentException("missing configuration");
        return v;
    }
}
