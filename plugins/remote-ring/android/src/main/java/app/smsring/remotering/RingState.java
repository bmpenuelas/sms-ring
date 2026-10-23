package app.smsring.remotering;

import android.os.Handler;
import android.os.Looper;
import androidx.annotation.Nullable;
import java.util.concurrent.CopyOnWriteArrayList;

/** In-process ring state shared by the service, the stop screen and the plugin. */
public final class RingState {

    public interface Listener {
        void onRingStateChanged(RingState state);
    }

    public final boolean ringing;
    @Nullable public final String reason;
    public final long endsAt;
    @Nullable public final String sender;

    private RingState(boolean ringing, @Nullable String reason, long endsAt, @Nullable String sender) {
        this.ringing = ringing;
        this.reason = reason;
        this.endsAt = endsAt;
        this.sender = sender;
    }

    private static final RingState IDLE = new RingState(false, null, 0, null);
    private static volatile RingState current = IDLE;
    private static final CopyOnWriteArrayList<Listener> listeners = new CopyOnWriteArrayList<>();
    private static final Handler main = new Handler(Looper.getMainLooper());

    public static RingState current() {
        return current;
    }

    static void setRinging(String reason, long endsAt, @Nullable String sender) {
        publish(new RingState(true, reason, endsAt, sender));
    }

    static void setIdle() {
        publish(IDLE);
    }

    private static void publish(RingState state) {
        current = state;
        main.post(() -> {
            for (Listener l : listeners) l.onRingStateChanged(state);
        });
    }

    public static void addListener(Listener listener) {
        listeners.addIfAbsent(listener);
    }

    public static void removeListener(Listener listener) {
        listeners.remove(listener);
    }
}
