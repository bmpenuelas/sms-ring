package app.smsring.remotering;

import static org.junit.Assert.assertEquals;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

/** Runs the vectors shared with the TypeScript and Swift matchers. */
public class MessageMatcherTest {

    private static JSONObject fixtures() throws Exception {
        byte[] raw = Files.readAllBytes(Paths.get("..", "test-fixtures", "matching.json"));
        return new JSONObject(new String(raw, StandardCharsets.UTF_8));
    }

    @Test
    public void normalizePhrase() throws Exception {
        JSONArray cases = fixtures().getJSONArray("normalizePhrase");
        for (int i = 0; i < cases.length(); i++) {
            JSONArray c = cases.getJSONArray(i);
            assertEquals(c.getString(0), c.getString(1), MessageMatcher.normalizePhrase(c.getString(0)));
        }
    }

    @Test
    public void sendersMatch() throws Exception {
        JSONArray cases = fixtures().getJSONArray("sendersMatch");
        for (int i = 0; i < cases.length(); i++) {
            JSONArray c = cases.getJSONArray(i);
            assertEquals(c.toString(), c.getBoolean(2), MessageMatcher.sendersMatch(c.getString(0), c.getString(1)));
        }
    }

    @Test
    public void evaluate() throws Exception {
        JSONArray cases = fixtures().getJSONArray("evaluate");
        for (int i = 0; i < cases.length(); i++) {
            JSONObject c = cases.getJSONObject(i);
            JSONObject config = c.getJSONObject("config");
            List<String> senders = new ArrayList<>();
            JSONArray s = config.getJSONArray("senders");
            for (int j = 0; j < s.length(); j++) senders.add(s.getString(j));
            MessageMatcher.Verdict verdict = MessageMatcher.evaluate(
                config.getBoolean("armed"), config.getString("passphrase"), senders, c.getString("body"), c.getString("sender"),
                config.optBoolean("vibrateOnlyEnabled", true), config.optString("vibrateOnlyPhrase", "")
            );
            assertEquals(c.getString("body"), c.getString("verdict"), verdict.name().toLowerCase().replace('_', '-'));
        }
    }

    @Test
    public void vibrationConfigRoundTrip() throws Exception {
        JSONObject json = new JSONObject()
            .put("passphrase", "blue tiger moon")
            .put("vibrateOnlyEnabled", true)
            .put("vibrateOnlyPhrase", "hush please")
            .put("vibrate", false);
        RingConfig config = RingConfig.fromJson(json);
        RingConfig restored = RingConfig.fromJson(config.toJson());
        assertEquals(true, restored.vibrateOnlyEnabled);
        assertEquals("hush please", restored.vibrateOnlyPhrase);
        assertEquals(false, restored.vibrate);
        assertEquals(MessageMatcher.Verdict.VIBRATE_ONLY, restored.evaluate("hush please 'blue tiger moon'", ""));
        assertEquals(MessageMatcher.Verdict.RING, restored.evaluate("blue tiger moon", ""));
        assertEquals(true, RingConfig.fromJson(new JSONObject()).vibrateOnlyEnabled);
        assertEquals(false, RingConfig.fromJson(json.put("vibrateOnlyEnabled", false)).vibrateOnlyEnabled);
    }
}
