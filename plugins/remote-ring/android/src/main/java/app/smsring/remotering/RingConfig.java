package app.smsring.remotering;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Immutable copy of the web UI's RingConfig (plugins/remote-ring/src/definitions.ts). */
public final class RingConfig {

    public static final int MIN_DURATION = 5;
    public static final int MAX_DURATION = 600;
    public static final int MAX_SENDERS = 10;
    public static final int MIN_VOLUME = 10;
    public static final int MAX_VOLUME = 100;

    public final boolean armed;
    public final String passphrase;
    public final List<String> senders;
    public final int durationSeconds;
    public final boolean vibrate;
    public final boolean overrideDnd;
    public final String tone;
    /** Percent of the maximum alarm volume. */
    public final int volume;
    /** Also ring from chat apps' notifications (ChatNotificationListener). */
    public final boolean chatApps;

    private RingConfig(boolean armed, String passphrase, List<String> senders, int durationSeconds, boolean vibrate, boolean overrideDnd, String tone, int volume, boolean chatApps) {
        this.armed = armed;
        this.passphrase = passphrase;
        this.senders = Collections.unmodifiableList(senders);
        this.durationSeconds = durationSeconds;
        this.vibrate = vibrate;
        this.overrideDnd = overrideDnd;
        this.tone = tone;
        this.volume = volume;
        this.chatApps = chatApps;
    }

    public static RingConfig fromJson(JSONObject json) {
        List<String> senders = new ArrayList<>();
        JSONArray array = json.optJSONArray("senders");
        if (array != null) {
            for (int i = 0; i < array.length() && senders.size() < MAX_SENDERS; i++) {
                String s = array.optString(i, "");
                if (!s.trim().isEmpty()) senders.add(s);
            }
        }
        int duration = json.optInt("durationSeconds", 60);
        return new RingConfig(
            json.optBoolean("armed", true),
            json.optString("passphrase", ""),
            senders,
            Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration)),
            json.optBoolean("vibrate", true),
            json.optBoolean("overrideDnd", true),
            RingTones.isKnown(json.optString("tone", null)) ? json.optString("tone") : RingTones.DEFAULT,
            Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, json.optInt("volume", MAX_VOLUME))),
            json.optBoolean("chatApps", false)
        );
    }

    public JSONObject toJson() throws JSONException {
        JSONObject json = new JSONObject();
        json.put("version", 1);
        json.put("armed", armed);
        json.put("passphrase", passphrase);
        json.put("senders", new JSONArray(senders));
        json.put("durationSeconds", durationSeconds);
        json.put("vibrate", vibrate);
        json.put("overrideDnd", overrideDnd);
        json.put("tone", tone);
        json.put("volume", volume);
        json.put("chatApps", chatApps);
        return json;
    }

    public MessageMatcher.Verdict evaluate(String body, String sender) {
        return MessageMatcher.evaluate(armed, passphrase, senders, body, sender);
    }
}
