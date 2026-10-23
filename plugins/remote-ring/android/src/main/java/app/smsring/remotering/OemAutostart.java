package app.smsring.remotering;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.annotation.Nullable;
import java.util.Locale;

/**
 * Some phone makers add their own "autostart" or "app launch" switch on top of
 * Android's battery settings, and keep apps from waking up in the background
 * until it's on (Xiaomi, Huawei, Honor, Oppo, Realme, OnePlus, Vivo, Asus…).
 * Android offers no way to read that switch, so we can only open its screen.
 * Component names follow the community list at dontkillmyapp.com; the first one
 * installed on this phone wins. The packages are listed under <queries> in the
 * manifest so Android 11+ lets us see them.
 */
final class OemAutostart {

    private static final String[][] SCREENS = {
        // Xiaomi, Redmi, POCO (MIUI / HyperOS)
        {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"},
        // Huawei (EMUI)
        {"com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
        {"com.huawei.systemmanager", "com.huawei.systemmanager.appcontrol.activity.StartupAppControlActivity"},
        {"com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"},
        // Honor (MagicOS)
        {"com.hihonor.systemmanager", "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
        // Oppo, Realme, OnePlus (ColorOS / realme UI / OxygenOS 12+)
        {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"},
        {"com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"},
        {"com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"},
        {"com.oneplus.security", "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity"},
        // Vivo, iQOO (Funtouch / OriginOS)
        {"com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"},
        {"com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"},
        {"com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"},
        // Asus (ZenUI)
        {"com.asus.mobilemanager", "com.asus.mobilemanager.autostart.AutoStartActivity"},
        {"com.asus.mobilemanager", "com.asus.mobilemanager.entry.FunctionActivity"},
        // Letv / LeEco
        {"com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity"},
    };

    private static final String[] BRANDS = {
        "xiaomi", "redmi", "poco", "huawei", "honor", "oppo", "realme", "oneplus", "vivo", "iqoo", "asus", "letv", "leeco",
    };

    private OemAutostart() {}

    /** The phone maker's autostart screen, or null when this phone has none we know of. */
    @Nullable
    static Intent screen(Context context) {
        String maker = (Build.MANUFACTURER + " " + Build.BRAND).toLowerCase(Locale.ROOT);
        boolean known = false;
        for (String brand : BRANDS) known |= maker.contains(brand);
        if (!known) return null;
        PackageManager pm = context.getPackageManager();
        for (String[] screen : SCREENS) {
            Intent intent = new Intent().setComponent(new ComponentName(screen[0], screen[1]));
            if (intent.resolveActivityInfo(pm, 0) != null) return intent;
        }
        return null;
    }
}
