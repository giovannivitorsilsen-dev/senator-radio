package rp.core;

import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public final class AccountAuthTest {
    private static class MemoryStore implements AccountAuth.Store {
        final Map<String,AccountAuth.Account> accounts=new ConcurrentHashMap<>();
        final Map<String,UUID> sessions=new ConcurrentHashMap<>();
        final Map<String,Long> expires=new ConcurrentHashMap<>();
        @Override public void create(AccountAuth.Account a) {
            if (accounts.putIfAbsent(a.username(),a)!=null) throw new IllegalArgumentException("duplicate");
        }
        @Override public Optional<AccountAuth.Account> byUsername(String u) {return Optional.ofNullable(accounts.get(u));}
        @Override public void saveSession(String hash,UUID id,long expiry) {sessions.put(hash,id);expires.put(hash,expiry);}
        @Override public Optional<UUID> resolveSession(String hash,long now) {
            return expires.getOrDefault(hash,0L)>now?Optional.ofNullable(sessions.get(hash)):Optional.empty();
        }
        @Override public void deleteSession(String hash) {sessions.remove(hash);expires.remove(hash);}
    }
    static void check(boolean v,String msg) {if(!v)throw new AssertionError(msg);}
    public static void main(String[] args) throws Exception {
        var store=new MemoryStore();
        Clock clock=Clock.fixed(Instant.parse("2026-11-06T10:00:00Z"),ZoneOffset.UTC);
        var auth=new AccountAuth(store,clock);
        char[] secret="A-Long-Secret-Password-2026".toCharArray();
        UUID user=auth.register("Gamer_01",secret);
        check(Arrays.equals(secret,new char[secret.length]),"registration must clear password chars");
        check(!store.accounts.get("gamer_01").encodedPassword().contains("Long-Secret"),"hashing must not store plaintext");
        check(auth.login("Gamer_01","wrong-password!".toCharArray()).isEmpty(),"wrong password rejected");
        var login=auth.login("Gamer_01","A-Long-Secret-Password-2026".toCharArray()).orElseThrow();
        check(user.equals(auth.authenticate(login.token()).orElseThrow()),"valid bearer token resolves");
        check(store.sessions.keySet().stream().noneMatch(s->s.equals(login.token())),"raw tokens never stored");
        check(auth.authenticate("invalid-token").isEmpty(),"invalid token rejected");
        auth.logout(login.token());
        check(auth.authenticate(login.token()).isEmpty(),"logout revokes session");
        var login2=auth.login("Gamer_01","A-Long-Secret-Password-2026".toCharArray()).orElseThrow();
        var expired=new AccountAuth(store,Clock.offset(clock,Duration.ofHours(13)));
        check(expired.authenticate(login2.token()).isEmpty(),"expired sessions denied");
        try { auth.register("a","short".toCharArray());throw new AssertionError("should reject"); }
        catch(IllegalArgumentException expected){}
        System.out.println("AccountAuth tests PASS");
    }
}
