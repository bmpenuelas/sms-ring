package app.smsring.remotering;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

/**
 * Bridge between the web UI and the native ringer. Every system dialog or
 * settings page is opened only from requestCapability(), which the UI calls
 * after its own explanation screen and the user's confirmation.
 */
@CapacitorPlugin(
    name = "RemoteRing",
    permissions = {
        @Permission(alias = RemoteRingPlugin.SMS, strings = { Manifest.permission.RECEIVE_SMS }),
        @Permission(alias = RemoteRingPlugin.NOTIFICATIONS, strings = { "android.permission.POST_NOTIFICATIONS" })
    }
)
public class RemoteRingPlugin extends Plugin implements RingState.Listener {

    static final String SMS = "sms";
    static final String NOTIFICATIONS = "notifications";
    private static final String FULL_SCREEN = "fullScreen";
    private static final String BATTERY = "battery";
    private static final String DND = "dnd";
    private static final String UNUSED_APPS = "unusedApps";
    private static final String AUTOSTART = "autostart";
    private static final String NOTIFICATION_ACCESS = "notificationAccess";
    /** Set once the user has been to the phone maker's autostart screen (it can't be read back). */
    private static final String KEY_AUTOSTART_VISITED = "autostartVisited";

    @Override
    public void load() {
        RingState.addListener(this);
        HealthCheck.schedule(getContext());
    }

    /** The app was already running when the "can't ring" warning was tapped. */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        if (intent != null && HealthCheck.ACTION_REVIEW.equals(intent.getAction())) {
            intent.setAction(Intent.ACTION_MAIN);
            notifyListeners("healthNoticeOpened", new JSObject(), true);
        }
    }

    @Override
    protected void handleOnDestroy() {
        RingState.removeListener(this);
    }

    @Override
    public void onRingStateChanged(RingState state) {
        notifyListeners("ringStateChange", ringStateJson(state));
    }

    // ---- Configuration ----

    @PluginMethod
    public void getConfig(PluginCall call) {
        JSONObject config = RingStore.loadConfigJson(getContext());
        JSObject result = new JSObject();
        try {
            result.put("config", config == null ? JSONObject.NULL : JSObject.fromJSONObject(config));
        } catch (JSONException e) {
            result.put("config", JSONObject.NULL);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void setConfig(PluginCall call) {
        JSObject config = call.getObject("config");
        if (config == null) {
            call.reject("config is required");
            return;
        }
        try {
            RingStore.saveConfig(getContext(), config);
            HealthCheck.clearIfHealthy(getContext());
            call.resolve();
        } catch (JSONException e) {
            call.reject("invalid config", e);
        }
    }

    /** Whether the app was started by tapping the "can't ring" warning (answers true once). */
    @PluginMethod
    public void getLaunchRequest(PluginCall call) {
        boolean healthNotice = false;
        if (getActivity() != null) {
            Intent intent = getActivity().getIntent();
            if (intent != null && HealthCheck.ACTION_REVIEW.equals(intent.getAction())) {
                intent.setAction(Intent.ACTION_MAIN);
                healthNotice = true;
            }
        }
        JSObject result = new JSObject();
        result.put("healthNotice", healthNotice);
        call.resolve(result);
    }

    /** "Don't remind me again": the daily check stops warning about these until they work and break again. */
    @PluginMethod
    public void setHealthIgnored(PluginCall call) {
        JSArray names = call.getArray("names");
        List<String> list = new ArrayList<>();
        if (names != null) {
            for (int i = 0; i < names.length(); i++) {
                String name = names.optString(i, "");
                if (!name.isEmpty()) list.add(name);
            }
        }
        HealthCheck.ignore(getContext(), list);
        call.resolve();
    }

    // ---- Capabilities ----

    @PluginMethod
    public void checkCapabilities(PluginCall call) {
        // Called whenever the app opens or resumes: drop a stale "can't ring" warning.
        HealthCheck.clearIfHealthy(getContext());
        call.resolve(capabilities());
    }

    @PluginMethod
    public void requestCapability(PluginCall call) {
        String name = call.getString("name", "");
        Context ctx = getContext();
        switch (name) {
            case SMS:
                requestPermissionForAlias(SMS, call, "permissionCallback");
                return;
            case NOTIFICATIONS:
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState(NOTIFICATIONS) != PermissionState.DENIED) {
                    requestPermissionForAlias(NOTIFICATIONS, call, "permissionCallback");
                } else {
                    startActivityForResult(call, notificationSettings(ctx), "settingsCallback");
                }
                return;
            case FULL_SCREEN:
                if (Build.VERSION.SDK_INT >= 34) {
                    startActivityForResult(call, appScoped("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT"), "settingsCallback");
                    return;
                }
                break;
            case BATTERY:
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    startActivityForResult(call, appScoped(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS), "settingsCallback");
                    return;
                }
                break;
            case DND:
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    startActivityForResult(call, new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS), "settingsCallback");
                    return;
                }
                break;
            case UNUSED_APPS:
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    startActivityForResult(call, appScoped(Intent.ACTION_AUTO_REVOKE_PERMISSIONS), "settingsCallback");
                    return;
                }
                break;
            case AUTOSTART: {
                Intent screen = OemAutostart.screen(ctx);
                if (screen != null) {
                    RingStore.prefs(ctx).edit().putBoolean(KEY_AUTOSTART_VISITED, true).apply();
                    try {
                        startActivityForResult(call, screen, "settingsCallback");
                        return;
                    } catch (RuntimeException e) {
                        // Not exported on this firmware: fall through to the app's own page.
                        startActivityForResult(call, appScoped(Settings.ACTION_APPLICATION_DETAILS_SETTINGS), "settingsCallback");
                        return;
                    }
                }
                break;
            }
            case NOTIFICATION_ACCESS:
                startActivityForResult(call, notificationAccessSettings(ctx), "settingsCallback");
                return;
            default:
                call.reject("unknown capability: " + name);
                return;
        }
        call.resolve(capabilities());
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        call.resolve(capabilities());
    }

    @ActivityCallback
    private void settingsCallback(PluginCall call, ActivityResult result) {
        if (call != null) call.resolve(capabilities());
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        String name = call.getString("name", "");
        Intent intent;
        switch (name) {
            case NOTIFICATIONS:
                intent = notificationSettings(getContext());
                break;
            case FULL_SCREEN:
                intent = Build.VERSION.SDK_INT >= 34
                    ? appScoped("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT")
                    : appScoped(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                break;
            case BATTERY:
                intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                break;
            case DND:
                intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                break;
            case UNUSED_APPS:
                intent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                    ? appScoped(Intent.ACTION_AUTO_REVOKE_PERMISSIONS)
                    : appScoped(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                break;
            case NOTIFICATION_ACCESS:
                intent = notificationAccessSettings(getContext());
                break;
            default:
                intent = appScoped(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        }
        startActivityForResult(call, intent, "settingsCallback");
    }

    private JSObject capabilities() {
        Context ctx = getContext();
        JSObject caps = new JSObject();
        caps.put(SMS, runtimeState(SMS));

        boolean notificationsOn = NotificationManagerCompat.from(ctx).areNotificationsEnabled();
        if (notificationsOn) caps.put(NOTIFICATIONS, "granted");
        else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState(NOTIFICATIONS) != PermissionState.DENIED) caps.put(NOTIFICATIONS, "prompt");
        else caps.put(NOTIFICATIONS, "blocked");

        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 34) caps.put(FULL_SCREEN, nm != null && nm.canUseFullScreenIntent() ? "granted" : "prompt");
        else caps.put(FULL_SCREEN, "unsupported");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = ctx.getSystemService(PowerManager.class);
            caps.put(BATTERY, pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName()) ? "granted" : "prompt");
            caps.put(DND, nm != null && nm.isNotificationPolicyAccessGranted() ? "granted" : "prompt");
        } else {
            caps.put(BATTERY, "unsupported");
            caps.put(DND, "unsupported");
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            caps.put(UNUSED_APPS, ctx.getPackageManager().isAutoRevokeWhitelisted() ? "granted" : "prompt");
        } else {
            caps.put(UNUSED_APPS, "unsupported");
        }

        if (OemAutostart.screen(ctx) == null) caps.put(AUTOSTART, "unsupported");
        else caps.put(AUTOSTART, RingStore.prefs(ctx).getBoolean(KEY_AUTOSTART_VISITED, false) ? "granted" : "prompt");

        boolean listening = NotificationManagerCompat.getEnabledListenerPackages(ctx).contains(ctx.getPackageName());
        caps.put(NOTIFICATION_ACCESS, listening ? "granted" : "prompt");
        return caps;
    }

    private String runtimeState(String alias) {
        PermissionState state = getPermissionState(alias);
        if (state == PermissionState.GRANTED) return "granted";
        if (state == PermissionState.DENIED) return "blocked";
        return "prompt";
    }

    private Intent appScoped(String action) {
        return new Intent(action, Uri.parse("package:" + getContext().getPackageName()));
    }

    private static Intent notificationAccessSettings(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).putExtra(
                Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                new android.content.ComponentName(ctx, ChatNotificationListener.class).flattenToString()
            );
        }
        return new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
    }

    private static Intent notificationSettings(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, ctx.getPackageName());
        }
        return new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + ctx.getPackageName()));
    }

    // ---- Ringing ----

    @PluginMethod
    public void startRinging(PluginCall call) {
        int duration = call.getInt("durationSeconds", 60);
        boolean vibrate = Boolean.TRUE.equals(call.getBoolean("vibrate", true));
        RingController.start(getContext(), duration, vibrate, "test", null);
        call.resolve();
    }

    @PluginMethod
    public void stopRinging(PluginCall call) {
        RingController.stop(getContext());
        call.resolve();
    }

    // ---- Tone preview (current alarm volume, never raised) ----

    @Nullable private android.media.MediaPlayer preview;
    private final android.os.Handler previewHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable previewEnd = this::releasePreview;

    @PluginMethod
    public void previewTone(PluginCall call) {
        releasePreview();
        android.media.AudioAttributes attributes = new android.media.AudioAttributes.Builder()
            .setUsage(android.media.AudioAttributes.USAGE_ALARM)
            .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        preview = RingTones.create(getContext(), call.getString("tone", RingTones.DEFAULT), attributes, 0);
        if (preview != null) {
            preview.start();
            previewHandler.postDelayed(previewEnd, 4000);
        }
        call.resolve();
    }

    @PluginMethod
    public void stopPreview(PluginCall call) {
        releasePreview();
        call.resolve();
    }

    private void releasePreview() {
        previewHandler.removeCallbacks(previewEnd);
        if (preview == null) return;
        try {
            preview.stop();
        } catch (IllegalStateException ignored) {
            // Never started.
        }
        preview.release();
        preview = null;
    }

    @PluginMethod
    public void getRingState(PluginCall call) {
        call.resolve(ringStateJson(RingState.current()));
    }

    private static JSObject ringStateJson(RingState state) {
        JSObject json = new JSObject();
        json.put("ringing", state.ringing);
        if (state.ringing) {
            json.put("reason", state.reason);
            json.put("endsAt", state.endsAt);
            if (state.sender != null) json.put("sender", state.sender);
        }
        return json;
    }

    // ---- History ----

    @PluginMethod
    public void getHistory(PluginCall call) {
        JSObject result = new JSObject();
        try {
            result.put("records", new JSArray(RingStore.loadHistory(getContext()).toString()));
        } catch (JSONException e) {
            result.put("records", new JSArray());
        }
        call.resolve(result);
    }

    @PluginMethod
    public void clearHistory(PluginCall call) {
        RingStore.clearHistory(getContext());
        call.resolve();
    }

    // ---- Platform proof ----

    @PluginMethod
    public void getPlatformInfo(PluginCall call) {
        Context ctx = getContext();
        JSONArray declared = new JSONArray();
        boolean internet = false;
        try {
            PackageInfo info = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), PackageManager.GET_PERMISSIONS);
            if (info.requestedPermissions != null) {
                for (String p : info.requestedPermissions) {
                    declared.put(p);
                    if (Manifest.permission.INTERNET.equals(p)) internet = true;
                }
            }
        } catch (PackageManager.NameNotFoundException ignored) {
            // Our own package always exists.
        }
        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("triggerMode", "sms");
        result.put("declaredPermissions", declared);
        result.put("hasInternetPermission", internet);
        result.put("osVersion", "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")");
        call.resolve(result);
    }
}
