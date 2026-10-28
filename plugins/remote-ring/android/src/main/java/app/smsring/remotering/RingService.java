package app.smsring.remotering;

import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.ServiceCompat;

/**
 * Rings at full alarm volume for the configured time. Runs as a foreground
 * service so Android keeps it alive with the screen off; restores the user's
 * volume and Do Not Disturb state when it stops.
 */
public class RingService extends Service {

    private static final String TAG = "RemoteRing";
    private static final String EXTRA_DURATION = "durationSeconds";
    private static final String EXTRA_VIBRATE = "vibrate";
    private static final String EXTRA_VIBRATE_ONLY = "vibrateOnly";
    private static final String EXTRA_REASON = "reason";
    private static final String EXTRA_SENDER = "sender";

    static final long[] VIBRATION_PATTERN = {0, 800, 400, 800, 1200};

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable timeout = this::stopSelf;

    @Nullable private MediaPlayer player;
    @Nullable private Vibrator vibrator;
    @Nullable private PowerManager.WakeLock wakeLock;
    @Nullable private AudioFocusRequest focusRequest;
    private int previousAlarmVolume = -1;
    private int previousInterruptionFilter = -1;

    static Intent startIntent(Context context, int durationSeconds, boolean vibrate, String reason, @Nullable String sender, boolean vibrateOnly) {
        return new Intent(context, RingService.class)
            .putExtra(EXTRA_DURATION, durationSeconds)
            .putExtra(EXTRA_VIBRATE, vibrate)
            .putExtra(EXTRA_VIBRATE_ONLY, vibrateOnly)
            .putExtra(EXTRA_REASON, reason)
            .putExtra(EXTRA_SENDER, sender);
    }

    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        int duration = Math.max(RingConfig.MIN_DURATION, Math.min(RingConfig.MAX_DURATION, intent.getIntExtra(EXTRA_DURATION, 60)));
        boolean vibrate = intent.getBooleanExtra(EXTRA_VIBRATE, true);
        boolean vibrateOnly = intent.getBooleanExtra(EXTRA_VIBRATE_ONLY, false);
        String reason = intent.getStringExtra(EXTRA_REASON);
        String sender = intent.getStringExtra(EXTRA_SENDER);
        long endsAt = System.currentTimeMillis() + duration * 1000L;

        RingNotifications.ensureChannels(this);
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        ServiceCompat.startForeground(
            this,
            RingNotifications.NOTIFICATION_ID,
            RingNotifications.ringing(this, RingNotifications.CHANNEL_ACTIVE, endsAt, sender, false, vibrateOnly),
            type
        );

        // A new trigger while ringing restarts the timer and keeps the tone going.
        handler.removeCallbacks(timeout);
        handler.postDelayed(timeout, duration * 1000L);
        acquireWakeLock(duration);
        if (vibrateOnly) {
            // Also handles an audible ring being replaced by a silent trigger.
            stopAudio();
        } else {
            liftDoNotDisturb();
            raiseAlarmVolume();
            startTone();
        }
        if (vibrateOnly || vibrate) startVibration(); else stopVibration();

        RingState.setRinging(reason == null ? "sms" : reason, endsAt, sender);
        return START_NOT_STICKY;
    }

    private void acquireWakeLock(int durationSeconds) {
        if (wakeLock == null) {
            PowerManager pm = getSystemService(PowerManager.class);
            if (pm == null) return;
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "RemoteRing:ring");
            wakeLock.setReferenceCounted(false);
        }
        wakeLock.acquire((durationSeconds + 5) * 1000L);
    }

    /** Sets the alarm stream to the configured share of its maximum (100% by default). */
    private void raiseAlarmVolume() {
        AudioManager am = getSystemService(AudioManager.class);
        if (am == null) return;
        RingConfig config = RingStore.loadConfig(this);
        int percent = config != null ? config.volume : RingConfig.MAX_VOLUME;
        int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
        try {
            if (previousAlarmVolume < 0) previousAlarmVolume = am.getStreamVolume(AudioManager.STREAM_ALARM);
            am.setStreamVolume(AudioManager.STREAM_ALARM, Math.max(1, Math.round(max * percent / 100f)), 0);
        } catch (SecurityException e) {
            Log.w(TAG, "Could not raise alarm volume", e);
        }
    }

    private void liftDoNotDisturb() {
        RingConfig config = RingStore.loadConfig(this);
        if (config == null || !config.overrideDnd || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null || !nm.isNotificationPolicyAccessGranted()) return;
        int filter = nm.getCurrentInterruptionFilter();
        // "Total silence" blocks alarms; "Alarms only" and "Priority" already let them through.
        if (filter == NotificationManager.INTERRUPTION_FILTER_NONE) {
            if (previousInterruptionFilter < 0) previousInterruptionFilter = filter;
            nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALARMS);
        }
    }

    private void startTone() {
        if (player != null) return;
        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        AudioManager am = getSystemService(AudioManager.class);
        if (am != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(attributes)
                .build();
            am.requestAudioFocus(focusRequest);
        }
        int session = am != null ? am.generateAudioSessionId() : 0;
        RingConfig config = RingStore.loadConfig(this);
        player = RingTones.create(this, config != null ? config.tone : RingTones.DEFAULT, attributes, session);
        if (player == null) {
            Log.e(TAG, "Could not load ring tone");
            return;
        }
        player.setVolume(1f, 1f);
        player.start();
    }

    private void startVibration() {
        if (vibrator == null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = getSystemService(VibratorManager.class);
                vibrator = vm != null ? vm.getDefaultVibrator() : null;
            } else {
                vibrator = getSystemService(Vibrator.class);
            }
        }
        if (vibrator == null || !vibrator.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            vibrator.vibrate(
                VibrationEffect.createWaveform(VIBRATION_PATTERN, 0),
                VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM)
            );
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(
                VibrationEffect.createWaveform(VIBRATION_PATTERN, 0),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
            );
        } else {
            vibrator.vibrate(VIBRATION_PATTERN, 0);
        }
    }

    private void stopVibration() {
        if (vibrator != null) vibrator.cancel();
    }

    /** Release sound and restore audio settings without stopping the vibration/timer. */
    private void stopAudio() {
        if (player != null) {
            try {
                player.stop();
            } catch (IllegalStateException ignored) {
                // Already stopped.
            }
            player.release();
            player = null;
        }
        AudioManager am = getSystemService(AudioManager.class);
        if (am != null) {
            if (focusRequest != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) am.abandonAudioFocusRequest(focusRequest);
            if (previousAlarmVolume >= 0) {
                try {
                    am.setStreamVolume(AudioManager.STREAM_ALARM, previousAlarmVolume, 0);
                } catch (SecurityException ignored) {
                    // Leave it; the user can lower it.
                }
            }
        }
        if (previousInterruptionFilter >= 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null && nm.isNotificationPolicyAccessGranted()) nm.setInterruptionFilter(previousInterruptionFilter);
        }
        focusRequest = null;
        previousAlarmVolume = -1;
        previousInterruptionFilter = -1;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(timeout);
        stopAudio();
        stopVibration();
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        RingState.setIdle();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
