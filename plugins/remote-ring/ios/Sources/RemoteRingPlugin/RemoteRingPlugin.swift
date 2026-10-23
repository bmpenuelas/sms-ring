import AVFoundation
import Capacitor
import Foundation
import UIKit
import UserNotifications

/// Bridge between the web UI and the native ringer. iOS never lets apps read
/// SMS, so messages arrive through an Apple Shortcuts automation that calls
/// the app's "Ring if passphrase matches" intent (RingTrigger.handleAutomation).
@objc(RemoteRingPlugin)
public class RemoteRingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RemoteRingPlugin"
    public let jsName = "RemoteRing"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getConfig", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setConfig", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestCapability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLaunchRequest", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setHealthIgnored", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startRinging", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopRinging", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "previewTone", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopPreview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getRingState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getHistory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearHistory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPlatformInfo", returnType: CAPPluginReturnPromise),
    ]

    private var observer: NSObjectProtocol?

    override public func load() {
        observer = NotificationCenter.default.addObserver(forName: RingEngine.stateDidChange, object: nil, queue: .main) { [weak self] note in
            self?.notifyListeners("ringStateChange", data: (note.userInfo as? [String: Any]) ?? ["ringing": false])
        }
    }

    deinit {
        if let observer { NotificationCenter.default.removeObserver(observer) }
    }

    // MARK: Configuration

    @objc func getConfig(_ call: CAPPluginCall) {
        guard let config = RingStore.loadConfig(),
              let data = try? JSONEncoder().encode(config),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            call.resolve(["config": NSNull()])
            return
        }
        call.resolve(["config": json])
    }

    @objc func setConfig(_ call: CAPPluginCall) {
        guard let raw = call.getObject("config"),
              let data = try? JSONSerialization.data(withJSONObject: raw),
              let config = try? JSONDecoder().decode(RingConfig.self, from: data) else {
            call.reject("invalid config")
            return
        }
        RingStore.saveConfig(config)
        call.resolve()
    }

    // MARK: Capabilities

    private func capabilities(_ completion: @escaping ([String: Any]) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let notifications: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral: notifications = "granted"
            case .denied: notifications = "blocked"
            default: notifications = "prompt"
            }
            completion([
                "sms": "unsupported",
                "notifications": notifications,
                "fullScreen": "unsupported",
                "unusedApps": "unsupported",
                "autostart": "unsupported",
                "notificationAccess": "unsupported",
                "battery": "unsupported",
                "dnd": "unsupported",
            ])
        }
    }

    @objc func checkCapabilities(_ call: CAPPluginCall) {
        capabilities { call.resolve($0) }
    }

    @objc func requestCapability(_ call: CAPPluginCall) {
        guard call.getString("name") == "notifications" else {
            capabilities { call.resolve($0) }
            return
        }
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in
            self.capabilities { call.resolve($0) }
        }
    }

    /// Android's daily check has no iPhone counterpart: nothing opens the app from it.
    @objc func getLaunchRequest(_ call: CAPPluginCall) {
        call.resolve(["healthNotice": false])
    }

    @objc func setHealthIgnored(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let target: String
            if #available(iOS 16.0, *), call.getString("name") == "notifications" {
                target = UIApplication.openNotificationSettingsURLString
            } else {
                target = UIApplication.openSettingsURLString
            }
            if let url = URL(string: target) { UIApplication.shared.open(url) }
            call.resolve()
        }
    }

    // MARK: Ringing

    @objc func startRinging(_ call: CAPPluginCall) {
        RingEngine.shared.start(
            durationSeconds: call.getInt("durationSeconds") ?? 60,
            vibrate: call.getBool("vibrate") ?? true,
            reason: "test",
            sender: nil
        )
        call.resolve()
    }

    @objc func stopRinging(_ call: CAPPluginCall) {
        RingEngine.shared.stop()
        call.resolve()
    }

    // MARK: Tone preview (a few seconds, current volume)

    private var preview: AVAudioPlayer?
    private var previewTimer: Timer?

    @objc func previewTone(_ call: CAPPluginCall) {
        let tone = call.getString("tone") ?? RingConfig.defaultTone
        DispatchQueue.main.async {
            self.endPreview()
            guard let url = RingConfig.toneURL(tone) else { return call.resolve() }
            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try? AVAudioSession.sharedInstance().setActive(true)
            self.preview = try? AVAudioPlayer(contentsOf: url)
            self.preview?.play()
            self.previewTimer = Timer.scheduledTimer(withTimeInterval: 4, repeats: false) { [weak self] _ in self?.endPreview() }
            call.resolve()
        }
    }

    @objc func stopPreview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.endPreview()
            call.resolve()
        }
    }

    private func endPreview() {
        previewTimer?.invalidate()
        previewTimer = nil
        preview?.stop()
        preview = nil
    }

    @objc func getRingState(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(RingEngine.shared.snapshot.dictionary) }
    }

    // MARK: History

    @objc func getHistory(_ call: CAPPluginCall) {
        let records: [[String: Any]] = RingStore.loadHistory().map { r in
            var out: [String: Any] = ["at": r.at, "reason": r.reason]
            if let sender = r.sender { out["sender"] = sender }
            return out
        }
        call.resolve(["records": records])
    }

    @objc func clearHistory(_ call: CAPPluginCall) {
        RingStore.clearHistory()
        call.resolve()
    }

    // MARK: Platform

    @objc func getPlatformInfo(_ call: CAPPluginCall) {
        var result: [String: Any] = [
            "platform": "ios",
            "triggerMode": "shortcuts",
            "declaredPermissions": [],
            // iOS has no per-app internet permission to inspect; see docs/PRIVACY.md.
            "hasInternetPermission": NSNull(),
            "osVersion": "iOS \(UIDevice.current.systemVersion)",
        ]
        if let run = RingStore.lastAutomationRun() {
            result["lastAutomationRun"] = ["at": run.at, "verdict": run.verdict]
        }
        call.resolve(result)
    }
}
