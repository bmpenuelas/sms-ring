package app.smsring.remotering;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/** Notification channels and the "ringing" notification. */
final class RingNotifications {

    /** Shown by the foreground service; silent because the service plays the tone itself. */
    static final String CHANNEL_ACTIVE = "remote_ring_active";
    /** Used only if Android refuses to start the service: the channel itself makes the sound. */
    static final String CHANNEL_FALLBACK = "remote_ring_fallback";
    /** Silent fallback: never reuse the audible fallback channel for a vibration-only trigger. */
    static final String CHANNEL_VIBRATE_ONLY = "remote_ring_vibrate_only";

    static final int NOTIFICATION_ID = 7301;

    private RingNotifications() {}

    static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel active = new NotificationChannel(
            CHANNEL_ACTIVE,
            context.getString(R.string.remote_ring_channel_active),
            NotificationManager.IMPORTANCE_HIGH
        );
        active.setDescription(context.getString(R.string.remote_ring_channel_active_description));
        active.setSound(null, null);
        active.enableVibration(false);
        active.setBypassDnd(true);
        active.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(active);

        NotificationChannel fallback = new NotificationChannel(
            CHANNEL_FALLBACK,
            context.getString(R.string.remote_ring_channel_fallback),
            NotificationManager.IMPORTANCE_HIGH
        );
        fallback.setDescription(context.getString(R.string.remote_ring_channel_fallback_description));
        fallback.setSound(
            toneUri(context),
            new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        );
        fallback.enableVibration(true);
        fallback.setVibrationPattern(RingService.VIBRATION_PATTERN);
        fallback.setBypassDnd(true);
        fallback.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(fallback);

        NotificationChannel vibration = new NotificationChannel(
            CHANNEL_VIBRATE_ONLY,
            context.getString(R.string.remote_ring_channel_vibrate_only),
            NotificationManager.IMPORTANCE_HIGH
        );
        vibration.setSound(null, null);
        vibration.enableVibration(true);
        vibration.setVibrationPattern(RingService.VIBRATION_PATTERN);
        vibration.setBypassDnd(true);
        vibration.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(vibration);
    }

    static Uri toneUri(Context context) {
        return new Uri.Builder()
            .scheme(ContentResolver.SCHEME_ANDROID_RESOURCE)
            .authority(context.getPackageName())
            .appendPath(String.valueOf(R.raw.remote_ring_tone))
            .build();
    }

    static Notification ringing(Context context, String channel, long endsAt, @Nullable String sender, boolean startServiceFromScreen, boolean vibrateOnly) {
        Intent screen = new Intent(context, RingActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION)
            .putExtra(RingActivity.EXTRA_START_SERVICE, startServiceFromScreen)
            .putExtra(RingActivity.EXTRA_VIBRATE_ONLY, vibrateOnly)
            .putExtra(RingActivity.EXTRA_SENDER, sender);
        PendingIntent screenIntent = PendingIntent.getActivity(
            context, 1, screen, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        PendingIntent stopIntent = PendingIntent.getBroadcast(
            context, 2, new Intent(context, StopRingReceiver.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        PendingIntent dismissIntent = PendingIntent.getBroadcast(
            context, 3, new Intent(context, StopRingReceiver.class).putExtra(StopRingReceiver.EXTRA_DISMISSED, true),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        // Android 12+ asks to unlock before running the Stop button from the lock screen.
        NotificationCompat.Action stop = new NotificationCompat.Action.Builder(0, context.getString(R.string.remote_ring_stop), stopIntent)
            .setAuthenticationRequired(true)
            .build();

        String text = sender == null
            ? context.getString(R.string.remote_ring_notification_text)
            : context.getString(R.string.remote_ring_notification_text_from, sender);

        return new NotificationCompat.Builder(context, channel)
            .setSilent(CHANNEL_ACTIVE.equals(channel))
            .setSound(vibrateOnly ? null : toneUri(context))
            .setVibrate(startServiceFromScreen ? RingService.VIBRATION_PATTERN : new long[] {0})
            .setSmallIcon(R.drawable.remote_ring_ic_notification)
            .setContentTitle(context.getString(R.string.remote_ring_notification_title))
            .setContentText(text)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setWhen(endsAt)
            .setShowWhen(true)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setContentIntent(screenIntent)
            .setFullScreenIntent(screenIntent, true)
            .setDeleteIntent(dismissIntent)
            .addAction(stop)
            .build();
    }
}
