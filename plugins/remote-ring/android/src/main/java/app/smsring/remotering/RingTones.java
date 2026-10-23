package app.smsring.remotering;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.util.Log;
import androidx.annotation.Nullable;

/**
 * The selectable ring tones (ids match TONES in src/core/config.ts). Bundled
 * tones are synthesized by scripts/generate-ringtone.mjs; "system" plays the
 * phone's own alarm sound and falls back to the default tone if that can't be read.
 */
public final class RingTones {

    private static final String TAG = "RemoteRing";
    public static final String DEFAULT = "beacon";

    private RingTones() {}

    public static boolean isKnown(@Nullable String id) {
        if (id == null) return false;
        switch (id) {
            case "beacon":
            case "chime":
            case "pulse":
            case "siren":
            case "bells":
            case "system":
                return true;
            default:
                return false;
        }
    }

    private static int rawFor(String id) {
        switch (id) {
            case "chime":
                return R.raw.tone_chime;
            case "pulse":
                return R.raw.tone_pulse;
            case "siren":
                return R.raw.tone_siren;
            case "bells":
                return R.raw.tone_bells;
            default:
                return R.raw.remote_ring_tone;
        }
    }

    /** A prepared, looping player for the tone, or null if nothing could be loaded. */
    @Nullable
    public static MediaPlayer create(Context context, @Nullable String id, AudioAttributes attributes, int session) {
        String tone = isKnown(id) ? id : DEFAULT;
        if ("system".equals(tone)) {
            MediaPlayer system = systemAlarm(context, attributes, session);
            if (system != null) return system;
            tone = DEFAULT;
        }
        MediaPlayer player = MediaPlayer.create(context, rawFor(tone), attributes, session);
        if (player != null) player.setLooping(true);
        return player;
    }

    @Nullable
    private static MediaPlayer systemAlarm(Context context, AudioAttributes attributes, int session) {
        Uri uri = RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_ALARM);
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (uri == null) uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        if (uri == null) return null;
        MediaPlayer player = new MediaPlayer();
        try {
            player.setAudioAttributes(attributes);
            if (session != 0) player.setAudioSessionId(session);
            player.setDataSource(context, uri);
            player.setLooping(true);
            player.prepare();
            return player;
        } catch (Exception e) {
            // A custom alarm file we can't read: use the bundled tone instead.
            Log.w(TAG, "System alarm sound unavailable, using the default tone", e);
            player.release();
            return null;
        }
    }
}
