package app.smsring.remotering;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.KeyguardManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Native stop screen shown over the lock screen while ringing. Kept native
 * (no WebView) so it appears instantly even when the app was not running.
 */
public class RingActivity extends AppCompatActivity implements RingState.Listener {

    static final String EXTRA_START_SERVICE = "startService";
    static final String EXTRA_VIBRATE_ONLY = "vibrateOnly";
    static final String EXTRA_SENDER = "sender";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<AnimatorSet> pulses = new ArrayList<>();
    private TextView countdown;
    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            RingState state = RingState.current();
            long left = Math.max(0, state.endsAt - System.currentTimeMillis());
            long seconds = (left + 999) / 1000;
            countdown.setText(String.format(Locale.getDefault(), "%d:%02d", seconds / 60, seconds % 60));
            handler.postDelayed(this, 250);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        showOverLockScreen();
        setContentView(R.layout.remote_ring_activity);

        countdown = findViewById(R.id.remote_ring_countdown);
        TextView subtitle = findViewById(R.id.remote_ring_subtitle);
        String sender = getIntent().getStringExtra(EXTRA_SENDER);
        if (sender == null) sender = RingState.current().sender;
        subtitle.setText(
            sender == null
                ? getString(R.string.remote_ring_notification_text)
                : getString(R.string.remote_ring_notification_text_from, sender)
        );

        findViewById(R.id.remote_ring_stop).setOnClickListener(v -> stopAfterUnlock());

        int[] rings = {R.id.remote_ring_wave_1, R.id.remote_ring_wave_2, R.id.remote_ring_wave_3};
        for (int i = 0; i < rings.length; i++) pulses.add(pulse(findViewById(rings[i]), i * 600L));
        ObjectAnimator wiggle = ObjectAnimator.ofFloat(findViewById(R.id.remote_ring_bell), View.ROTATION, -14f, 14f);
        wiggle.setDuration(140);
        wiggle.setRepeatMode(ValueAnimator.REVERSE);
        wiggle.setRepeatCount(ValueAnimator.INFINITE);
        wiggle.start();

        // Fallback path: Android refused the background start, so the screen starts the ringer.
        if (getIntent().getBooleanExtra(EXTRA_START_SERVICE, false) && !RingState.current().ringing) {
            RingConfig config = RingStore.loadConfig(this);
            int duration = config != null ? config.durationSeconds : 60;
            boolean vibrate = config == null || config.vibrate;
            boolean vibrateOnly = getIntent().getBooleanExtra(EXTRA_VIBRATE_ONLY, false);
            ContextCompat.startForegroundService(this, RingService.startIntent(this, duration, vibrate, "sms", sender, vibrateOnly));
        }
    }

    /**
     * Stop needs the phone unlocked when it has a PIN, pattern or fingerprint,
     * so whoever finds it can't silence it. Android 8+ shows the unlock prompt
     * over this screen; older versions can't, so they stop right away.
     */
    private void stopAfterUnlock() {
        KeyguardManager keyguard = getSystemService(KeyguardManager.class);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !RingController.isLockedSecurely(this)) {
            stopNow();
            return;
        }
        keyguard.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
            @Override
            public void onDismissSucceeded() {
                stopNow();
            }
        });
    }

    private void stopNow() {
        RingController.stop(this);
        finish();
    }

    private AnimatorSet pulse(View view, long delay) {
        ObjectAnimator sx = ObjectAnimator.ofFloat(view, View.SCALE_X, 0.4f, 1.6f);
        ObjectAnimator sy = ObjectAnimator.ofFloat(view, View.SCALE_Y, 0.4f, 1.6f);
        ObjectAnimator alpha = ObjectAnimator.ofFloat(view, View.ALPHA, 0.9f, 0f);
        for (ObjectAnimator a : new ObjectAnimator[] {sx, sy, alpha}) {
            a.setRepeatCount(ValueAnimator.INFINITE);
            a.setDuration(1800);
        }
        AnimatorSet set = new AnimatorSet();
        set.playTogether(sx, sy, alpha);
        set.setInterpolator(new DecelerateInterpolator());
        set.setStartDelay(delay);
        set.start();
        return set;
    }

    private void showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    protected void onStart() {
        super.onStart();
        RingState.addListener(this);
        handler.post(tick);
    }

    @Override
    protected void onStop() {
        RingState.removeListener(this);
        handler.removeCallbacks(tick);
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        for (AnimatorSet set : pulses) set.cancel();
        super.onDestroy();
    }

    @Override
    public void onRingStateChanged(RingState state) {
        if (!state.ringing) finish();
    }
}
