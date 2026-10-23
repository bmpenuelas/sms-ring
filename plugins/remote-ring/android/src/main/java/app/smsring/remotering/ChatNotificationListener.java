package app.smsring.remotering;

import android.app.Notification;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.util.List;

/**
 * Optional ("Ring from chat apps"): reads the text of incoming notifications
 * from WhatsApp, Messenger, Telegram, Signal, chat-mode Google Messages (RCS)
 * and any other app, so the passphrase works there too. Needs the user to
 * grant Notification access in Android's settings, and does nothing unless the
 * setting is on.
 *
 * Each notification is checked in memory exactly like an SMS and then
 * forgotten: no text is stored, and the app has no internet access. Only the
 * newest message of a conversation is checked, so an old message showing again
 * in an updated notification doesn't ring twice.
 */
public class ChatNotificationListener extends NotificationListenerService {

    /** The same message seen again within this window (updates, duplicates) is ignored. */
    private static final long REPEAT_WINDOW_MS = 10 * 60 * 1000;

    private static int lastHash;
    private static long lastAt;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || getPackageName().equals(sbn.getPackageName())) return;
        Notification n = sbn.getNotification();
        if (n == null || (n.flags & (Notification.FLAG_ONGOING_EVENT | Notification.FLAG_GROUP_SUMMARY)) != 0) return;

        RingConfig config = RingStore.loadConfig(this);
        if (config == null || !config.armed || !config.chatApps) return;

        String[] message = newestMessage(n);
        if (message == null) return;
        String text = message[0];
        String sender = message[1];

        int hash = (sbn.getPackageName() + "|" + text).hashCode();
        long now = System.currentTimeMillis();
        if (hash == lastHash && now - lastAt < REPEAT_WINDOW_MS) return;
        if (config.evaluate(text, sender) != MessageMatcher.Verdict.RING) return;
        lastHash = hash;
        lastAt = now;
        // An SMS also shows up here as the messaging app's notification: SmsReceiver
        // has usually started ringing already, and remembering the hash above keeps
        // a later update of that notification from ringing again after Stop.
        if (RingState.current().ringing) return;
        // History shows which app it came from, never the person or the text.
        RingController.start(this, config.durationSeconds, config.vibrate, "app", appLabel(n, sbn.getPackageName()));
    }

    /** {text, sender} of the newest message, or null when there's no text. */
    @Nullable
    private static String[] newestMessage(Notification n) {
        Bundle extras = n.extras;
        if (extras == null) return null;
        NotificationCompat.MessagingStyle style = NotificationCompat.MessagingStyle.extractMessagingStyleFromNotification(n);
        if (style != null) {
            List<NotificationCompat.MessagingStyle.Message> messages = style.getMessages();
            if (!messages.isEmpty()) {
                NotificationCompat.MessagingStyle.Message last = messages.get(messages.size() - 1);
                if (last.getText() == null) return null;
                CharSequence who = last.getPerson() != null ? last.getPerson().getName() : null;
                if (who == null) who = extras.getCharSequence(NotificationCompat.EXTRA_CONVERSATION_TITLE);
                if (who == null) who = extras.getCharSequence(NotificationCompat.EXTRA_TITLE);
                return new String[] {last.getText().toString(), who == null ? "" : who.toString()};
            }
        }
        CharSequence text = extras.getCharSequence(NotificationCompat.EXTRA_BIG_TEXT);
        if (text == null) text = extras.getCharSequence(NotificationCompat.EXTRA_TEXT);
        if (text == null) return null;
        CharSequence title = extras.getCharSequence(NotificationCompat.EXTRA_TITLE);
        return new String[] {text.toString(), title == null ? "" : title.toString()};
    }

    /** The posting app's name ("WhatsApp"), or null if Android won't tell us. */
    @Nullable
    private String appLabel(Notification n, String pkg) {
        PackageManager pm = getPackageManager();
        try {
            ApplicationInfo info = n.extras != null ? n.extras.getParcelable("android.appInfo") : null;
            if (info == null) info = pm.getApplicationInfo(pkg, 0);
            String label = pm.getApplicationLabel(info).toString();
            return label.equals(pkg) ? null : label;
        } catch (PackageManager.NameNotFoundException | RuntimeException e) {
            return null;
        }
    }
}
