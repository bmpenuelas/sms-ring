package app.smsring.remotering;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Once a day, checks that SMS Ring can still ring and, if not, says so with a
 * notification ("tap to fix"). The app is rarely opened, so without this a
 * permission turned off in Settings, or removed by Android, would go unnoticed
 * until the day the phone is lost. Runs fully on the phone; nothing is sent.
 */
public class HealthCheck extends JobService {

    private static final int JOB_ID = 7302;
    static final int NOTIFICATION_ID = 7303;
    static final String CHANNEL = "remote_ring_health";
    /** Action of the warning's tap: the app opens straight on the permissions list. */
    static final String ACTION_REVIEW = "app.smsring.remotering.REVIEW_PERMISSIONS";
    private static final String KEY_IGNORED = "healthIgnored";
    /** Repeat an unchanged warning at most this often. */
    private static final long REMIND_EVERY = TimeUnit.DAYS.toMillis(3);

    /** Schedules the daily check (kept across reboots). Safe to call often. */
    static void schedule(Context context) {
        JobScheduler js = context.getSystemService(JobScheduler.class);
        if (js == null) return;
        if (js.getPendingJob(JOB_ID) != null) return;
        JobInfo job = new JobInfo.Builder(JOB_ID, new ComponentName(context, HealthCheck.class))
            .setPeriodic(TimeUnit.DAYS.toMillis(1))
            .setPersisted(true)
            .build();
        js.schedule(job);
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        run(this);
        return false;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return false;
    }

    /** Checks now and posts, updates or clears the warning. */
    static void run(Context context) {
        RingConfig config = RingStore.loadConfig(context);
        NotificationManagerCompat nm = NotificationManagerCompat.from(context);
        List<String> problems = problems(context, config);
        SharedPreferences state = RingStore.prefs(context);
        if (problems.isEmpty()) {
            nm.cancel(NOTIFICATION_ID);
            state.edit().remove("healthProblems").remove("healthNotifiedAt").apply();
            return;
        }
        String key = android.text.TextUtils.join(",", problems);
        long now = System.currentTimeMillis();
        boolean changed = !key.equals(state.getString("healthProblems", ""));
        if (!changed && now - state.getLong("healthNotifiedAt", 0) < REMIND_EVERY) return;
        if (!nm.areNotificationsEnabled()) return;
        ensureChannel(context);
        try {
            nm.notify(NOTIFICATION_ID, warning(context));
        } catch (SecurityException e) {
            return;
        }
        state.edit().putString("healthProblems", key).putLong("healthNotifiedAt", now).apply();
    }

    /** Removes the warning once nothing is wrong any more (called when the app opens). */
    static void clearIfHealthy(Context context) {
        if (problems(context, RingStore.loadConfig(context)).isEmpty()) {
            NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
            RingStore.prefs(context).edit().remove("healthProblems").remove("healthNotifiedAt").apply();
        }
    }

    /** Stops warning about these (the user chose "don't remind me again"); anything else still warns. */
    static void ignore(Context context, List<String> names) {
        Set<String> ignored = new HashSet<>(RingStore.prefs(context).getStringSet(KEY_IGNORED, new HashSet<>()));
        ignored.addAll(names);
        RingStore.prefs(context).edit().putStringSet(KEY_IGNORED, ignored).apply();
        run(context);
    }

    /**
     * What keeps it from ringing right now (empty = all good, switched off on
     * purpose, or only things the user asked not to be reminded about).
     */
    static List<String> problems(Context context, RingConfig config) {
        List<String> problems = new ArrayList<>();
        if (config == null || !config.armed) return problems;
        List<String> missing = missing(context, config);
        SharedPreferences state = RingStore.prefs(context);
        Set<String> ignored = new HashSet<>(state.getStringSet(KEY_IGNORED, new HashSet<>()));
        // Once something works again its "ignore" ends, so it warns if it breaks later.
        if (ignored.retainAll(missing)) state.edit().putStringSet(KEY_IGNORED, ignored).apply();
        for (String name : missing) {
            if (!ignored.contains(name)) problems.add(name);
        }
        return problems;
    }

    private static List<String> missing(Context context, RingConfig config) {
        List<String> problems = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
            problems.add("sms");
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !context.getPackageManager().isAutoRevokeWhitelisted()) {
            problems.add("unusedApps");
        }
        if (config.chatApps && !NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.getPackageName())) {
            problems.add("notificationAccess");
        }
        return problems;
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL,
            context.getString(R.string.remote_ring_channel_health),
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription(context.getString(R.string.remote_ring_channel_health_description));
        nm.createNotificationChannel(channel);
    }

    private static Notification warning(Context context) {
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        // A different action makes a running app receive the tap too (see RemoteRingPlugin.handleOnNewIntent).
        if (open != null) open.setAction(ACTION_REVIEW);
        PendingIntent tap = open == null
            ? null
            : PendingIntent.getActivity(context, 4, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.remote_ring_ic_notification)
            .setContentTitle(context.getString(R.string.remote_ring_health_title))
            .setContentText(context.getString(R.string.remote_ring_health_text))
            .setStyle(new NotificationCompat.BigTextStyle().bigText(context.getString(R.string.remote_ring_health_text)))
            .setCategory(NotificationCompat.CATEGORY_ERROR)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(tap)
            .setAutoCancel(true)
            .build();
    }
}
