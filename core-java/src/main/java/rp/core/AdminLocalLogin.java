package rp.core;

import java.io.Console;
import java.time.Clock;
import java.util.Arrays;
import java.util.Optional;

/**
 * Operator-only CLI for an EXISTING LifeAccount.
 * Requires a real terminal; refuses noninteractive stdin so passwords are not piped.
 * Does not provision accounts or grant administrator permissions.
 */
public final class AdminLocalLogin {
    private AdminLocalLogin() {}
    public static void main(String[] args) {
        if(args.length!=1 || !args[0].matches("[a-zA-Z0-9_]{3,32}")){
            System.err.println("Usage: AdminLocalLogin ACCOUNT_USERNAME");
            System.exit(2);
        }
        Console terminal=System.console();
        if(terminal==null){
            System.err.println("Interactive terminal required");
            System.exit(2);
        }
        char[] password=terminal.readPassword("LifeAccount password: ");
        if(password==null){System.exit(2);return;}
        try {
            String url=required("LIFE_JDBC_URL");
            String user=required("LIFE_JDBC_USER");
            String secret=required("LIFE_JDBC_PASSWORD");
            DriverManagerDataSource ds=new DriverManagerDataSource(url,user,secret);
            AccountAuth auth=new AccountAuth(new AccountAuth.JdbcStore(ds),Clock.systemUTC());
            Optional<AccountAuth.Login> login=auth.login(args[0],password);
            if(login.isEmpty()){
                System.err.println("Login denied");
                System.exit(1);
                return;
            }
            System.out.println("SESSION_TOKEN="+login.get().token());
            System.out.println("Expires (UTC epoch seconds): "+login.get().expiresAtEpochSeconds());
            System.out.println("Use the session token ONLY in your local LifeAdmin dashboard.");
        } catch(Exception e) {
            System.err.println("Login unavailable");
            System.exit(1);
        } finally {Arrays.fill(password,'\0');}
    }
    private static String required(String key){
        String value=System.getenv(key);
        if(value==null||value.isBlank())throw new IllegalArgumentException("missing configuration");
        return value;
    }
}
