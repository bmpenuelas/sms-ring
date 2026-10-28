package app.smsring.remotering;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Called by Android for every incoming SMS (only the system can send this
 * broadcast: android:permission="BROADCAST_SMS"). The message is checked in
 * memory for the passphrase and then forgotten: no body is ever stored.
 */
public class SmsReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
        RingConfig config = RingStore.loadConfig(context);
        if (config == null || !config.armed) return;

        SmsMessage[] parts = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (parts == null) return;

        // Long messages arrive in several parts: join them per sender.
        Map<String, StringBuilder> bodies = new LinkedHashMap<>();
        for (SmsMessage part : parts) {
            if (part == null) continue;
            String sender = part.getDisplayOriginatingAddress();
            String body = part.getDisplayMessageBody();
            if (sender == null || body == null) continue;
            StringBuilder sb = bodies.get(sender);
            if (sb == null) bodies.put(sender, sb = new StringBuilder());
            sb.append(body);
        }

        for (Map.Entry<String, StringBuilder> entry : bodies.entrySet()) {
            MessageMatcher.Verdict verdict = config.evaluate(entry.getValue().toString(), entry.getKey());
            if (verdict == MessageMatcher.Verdict.RING || verdict == MessageMatcher.Verdict.VIBRATE_ONLY) {
                RingController.start(
                    context,
                    config.durationSeconds,
                    config.vibrate,
                    "sms",
                    MessageMatcher.maskSender(entry.getKey()),
                    verdict == MessageMatcher.Verdict.VIBRATE_ONLY
                );
                return;
            }
        }
    }
}
