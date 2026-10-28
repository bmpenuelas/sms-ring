package app.smsring.remotering;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

/** The one entry point to start or stop ringing, whoever asks (SMS, UI, notification). */
public final class RingController {

    private static final String TAG = "RemoteRing";

    private RingController() {}

    public static void start(Context context, int durationSeconds, boolean vibrate, String reason, @Nullable String maskedSender) {
        start(context, durationSeconds, vibrate, reason, maskedSender, false);
    }

    public static void start(Context context, int durationSeconds, boolean vibrate, String reason, @Nullable String maskedSender, boolean vibrateOnly) {
        Context app = context.getApplicationContext();
        RingNotifications.ensureChannels(app);
        RingStore.addHistory(app, reason, maskedSender);
        Intent intent = RingService.startIntent(app, durationSeconds, vibrate, reason, maskedSender, vibrateOnly);
        try {
            ContextCompat.startForegroundService(app, intent);
        } catch (RuntimeException e) {
            // Android 12+ may refuse a background start (ForegroundServiceStartNotAllowedException)
            // when battery optimization is on. Fall back to a full-screen alarm notification:
            // its channel rings, and opening the stop screen starts the full ringer.
            Log.w(TAG, "Foreground start refused, using full-screen notification", e);
            long endsAt = System.currentTimeMillis() + durationSeconds * 1000L;
            NotificationManager nm = app.getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.notify(
                    RingNotifications.NOTIFICATION_ID,
                    RingNotifications.ringing(app, vibrateOnly ? RingNotifications.CHANNEL_VIBRATE_ONLY : RingNotifications.CHANNEL_FALLBACK,
                        endsAt, maskedSender, true, vibrateOnly)
                );
            }
        }
    }

    /** True while a PIN, pattern, password or biometric lock is showing. */
    public static boolean isLockedSecurely(Context context) {
        android.app.KeyguardManager keyguard = context.getSystemService(android.app.KeyguardManager.class);
        if (keyguard == null || !keyguard.isKeyguardLocked()) return false;
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M ? keyguard.isKeyguardSecure() : keyguard.isDeviceSecure();
    }

    public static void stop(Context context) {
        Context app = context.getApplicationContext();
        app.stopService(new Intent(app, RingService.class));
        NotificationManager nm = app.getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(RingNotifications.NOTIFICATION_ID);
        RingState.setIdle();
    }
}
