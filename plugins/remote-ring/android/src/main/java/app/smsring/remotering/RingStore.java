package app.smsring.remotering;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.Nullable;
import androidx.core.os.UserManagerCompat;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * App-private storage for the configuration and the local trigger history.
 * Lives in the app sandbox only (device-protected storage, see prefs()):
 * backups are disabled in the app manifest and
 * nothing here is ever sent anywhere (the app has no INTERNET permission).
 */
public final class RingStore {

    private static final String PREFS = "remote_ring";
    private static final String KEY_CONFIG = "config";
    private static final String KEY_HISTORY = "history";
    private static final int HISTORY_LIMIT = 20;

    private RingStore() {}

    private static volatile boolean migrated;

    /**
     * Device-protected storage: readable before the first unlock after a
     * reboot (Direct Boot), so a phone that restarted while lost still rings.
     * Older installs kept it in the regular (credential-protected) storage;
     * it moves over the first time the phone is unlocked.
     */
    static SharedPreferences prefs(Context context) {
        Context app = context.getApplicationContext();
        Context storage = app.createDeviceProtectedStorageContext();
        if (!migrated && UserManagerCompat.isUserUnlocked(app)) {
            storage.moveSharedPreferencesFrom(app, PREFS);
            migrated = true;
        }
        return storage.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @Nullable
    public static RingConfig loadConfig(Context context) {
        JSONObject json = loadConfigJson(context);
        return json == null ? null : RingConfig.fromJson(json);
    }

    @Nullable
    public static JSONObject loadConfigJson(Context context) {
        String raw = prefs(context).getString(KEY_CONFIG, null);
        if (raw == null) return null;
        try {
            return new JSONObject(raw);
        } catch (JSONException e) {
            return null;
        }
    }

    public static void saveConfig(Context context, JSONObject config) throws JSONException {
        // Round-trip through RingConfig so only known, sanitized fields are kept.
        String normalized = RingConfig.fromJson(config).toJson().toString();
        prefs(context).edit().putString(KEY_CONFIG, normalized).apply();
    }

    public static synchronized void addHistory(Context context, String reason, @Nullable String maskedSender) {
        JSONArray current = loadHistory(context);
        JSONArray next = new JSONArray();
        try {
            JSONObject record = new JSONObject();
            record.put("at", System.currentTimeMillis());
            record.put("reason", reason);
            if (maskedSender != null) record.put("sender", maskedSender);
            next.put(record);
            for (int i = 0; i < current.length() && next.length() < HISTORY_LIMIT; i++) {
                next.put(current.get(i));
            }
        } catch (JSONException ignored) {
            return;
        }
        prefs(context).edit().putString(KEY_HISTORY, next.toString()).apply();
    }

    public static JSONArray loadHistory(Context context) {
        String raw = prefs(context).getString(KEY_HISTORY, "[]");
        try {
            return new JSONArray(raw);
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    public static void clearHistory(Context context) {
        prefs(context).edit().remove(KEY_HISTORY).apply();
    }
}
