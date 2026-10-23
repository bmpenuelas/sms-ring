package app.smsring.remotering;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * The notification's Stop button (and swipe-away). While the phone is locked
 * with a PIN, pattern or fingerprint it never stops directly: whoever finds the
 * phone must not be able to silence it.
 */
public class StopRingReceiver extends BroadcastReceiver {

    static final String EXTRA_DISMISSED = "dismissed";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!RingController.isLockedSecurely(context)) {
            RingController.stop(context);
            return;
        }
        // Swiping the notification away on the lock screen just leaves it ringing.
        if (intent.getBooleanExtra(EXTRA_DISMISSED, false)) return;
        // Before Android 12 the action can't require unlocking itself: open the stop
        // screen, whose Stop button asks to unlock. (12+ unlocks before we get here.)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            context.startActivity(new Intent(context, RingActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }
    }
}
