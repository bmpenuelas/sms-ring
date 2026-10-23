import AVFoundation
import AudioToolbox
import Foundation
import MediaPlayer
import UIKit
import UserNotifications

public struct RingSnapshot {
    public let ringing: Bool
    public let reason: String?
    public let endsAt: Double?
    public let sender: String?

    static let idle = RingSnapshot(ringing: false, reason: nil, endsAt: nil, sender: nil)

    var dictionary: [String: Any] {
        var out: [String: Any] = ["ringing": ringing]
        if let reason { out["reason"] = reason }
        if let endsAt { out["endsAt"] = endsAt }
        if let sender { out["sender"] = sender }
        return out
    }
}

/// Plays the ring tone through the `.playback` audio session, which ignores
/// the silent switch and keeps running in the background (UIBackgroundModes
/// audio). Lock-screen media controls and a notification let the user stop it.
public final class RingEngine: NSObject {

    public static let shared = RingEngine()
    public static let stateDidChange = Notification.Name("app.smsring.remotering.stateDidChange")

    public private(set) var snapshot = RingSnapshot.idle

    private var player: AVAudioPlayer?
    private var stopTimer: Timer?
    private var vibrateTimer: Timer?
    private var commandTargets: [Any] = []
    private let notificationId = "app.smsring.remotering.ringing"

    /// Starts (or restarts) ringing. Safe to call from any thread.
    public func start(durationSeconds: Int, vibrate: Bool, reason: String, sender: String?) {
        DispatchQueue.main.async { self.startOnMain(durationSeconds: durationSeconds, vibrate: vibrate, reason: reason, sender: sender) }
    }

    public func stop() {
        DispatchQueue.main.async { self.stopOnMain() }
    }

    private func startOnMain(durationSeconds: Int, vibrate: Bool, reason: String, sender: String?) {
        let duration = max(RingConfig.minDuration, min(RingConfig.maxDuration, durationSeconds))
        do {
            let session = AVAudioSession.sharedInstance()
            // .playback ignores the Ring/Silent switch; no .mixWithOthers so music pauses.
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
        } catch {
            NSLog("RemoteRing: audio session failed: \(error)")
        }

        let config = RingStore.loadConfig()
        if player == nil, let url = RingConfig.toneURL(config?.tone ?? RingConfig.defaultTone) {
            player = try? AVAudioPlayer(contentsOf: url)
            player?.numberOfLoops = -1
            player?.volume = Float(config?.volume ?? RingConfig.maxVolume) / 100
            player?.prepareToPlay()
        }
        player?.play()

        stopTimer?.invalidate()
        stopTimer = Timer.scheduledTimer(withTimeInterval: TimeInterval(duration), repeats: false) { [weak self] _ in
            self?.stopOnMain()
        }

        vibrateTimer?.invalidate()
        vibrateTimer = nil
        if vibrate {
            AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
            vibrateTimer = Timer.scheduledTimer(withTimeInterval: 1.4, repeats: true) { _ in
                AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
            }
        }

        let endsAt = Date().timeIntervalSince1970 * 1000 + Double(duration) * 1000
        RingStore.addHistory(reason: reason, sender: sender)
        publish(RingSnapshot(ringing: true, reason: reason, endsAt: endsAt, sender: sender))
        showNowPlaying(duration: duration)
        postNotification(sender: sender)
    }

    private func stopOnMain() {
        stopTimer?.invalidate()
        stopTimer = nil
        vibrateTimer?.invalidate()
        vibrateTimer = nil
        player?.stop()
        player = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        clearNowPlaying()
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [notificationId])
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [notificationId])
        if snapshot.ringing { publish(.idle) }
    }

    private func publish(_ next: RingSnapshot) {
        snapshot = next
        NotificationCenter.default.post(name: Self.stateDidChange, object: nil, userInfo: next.dictionary)
    }

    // MARK: Lock screen controls

    private func showNowPlaying(duration: Int) {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = [
            MPMediaItemPropertyTitle: RemoteRingStrings.ringingTitle,
            MPMediaItemPropertyArtist: RemoteRingStrings.ringingStopHint,
            MPMediaItemPropertyPlaybackDuration: Double(duration),
            MPNowPlayingInfoPropertyElapsedPlaybackTime: 0.0,
            MPNowPlayingInfoPropertyPlaybackRate: 1.0,
        ]
        guard commandTargets.isEmpty else { return }
        let center = MPRemoteCommandCenter.shared()
        let stopHandler: (MPRemoteCommandEvent) -> MPRemoteCommandHandlerStatus = { [weak self] _ in
            // Whoever finds the phone can't silence it: with a passcode set, protected
            // data is unavailable while locked, so the controls only work once unlocked.
            guard UIApplication.shared.isProtectedDataAvailable else { return .commandFailed }
            self?.stopOnMain()
            return .success
        }
        commandTargets = [
            center.pauseCommand.addTarget(handler: stopHandler),
            center.stopCommand.addTarget(handler: stopHandler),
            center.togglePlayPauseCommand.addTarget(handler: stopHandler),
        ]
        center.playCommand.isEnabled = false
    }

    private func clearNowPlaying() {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        let center = MPRemoteCommandCenter.shared()
        for target in commandTargets {
            center.pauseCommand.removeTarget(target)
            center.stopCommand.removeTarget(target)
            center.togglePlayPauseCommand.removeTarget(target)
        }
        commandTargets = []
    }

    // MARK: Notification

    private func postNotification(sender: String?) {
        let center = UNUserNotificationCenter.current()
        center.getNotificationSettings { settings in
            guard settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional else { return }
            let content = UNMutableNotificationContent()
            content.title = RemoteRingStrings.ringingTitle
            content.body = sender.map { String(format: RemoteRingStrings.ringingFrom, $0) } ?? RemoteRingStrings.ringingBody
            content.interruptionLevel = .timeSensitive
            content.sound = nil
            center.add(UNNotificationRequest(identifier: self.notificationId, content: content, trigger: nil))
        }
    }
}

/// Native copy, localized through the app's Localizable.strings
/// (generated by scripts/generate-native-locales.mjs).
enum RemoteRingStrings {
    static var ringingTitle: String { NSLocalizedString("Your phone is ringing", bundle: .main, comment: "") }
    static var ringingBody: String { NSLocalizedString("A message contained your passphrase.", bundle: .main, comment: "") }
    static var ringingFrom: String { NSLocalizedString("Passphrase received from %@.", bundle: .main, comment: "") }
    static var ringingStopHint: String { NSLocalizedString("Unlock, then tap pause to stop", bundle: .main, comment: "") }
}

/// Entry point for the Shortcuts automation (see the app's RingIntents.swift).
public enum RingTrigger {
    /// Checks a message forwarded by a Shortcuts automation and rings if it matches.
    @discardableResult
    public static func handleAutomation(message: String, sender: String?) -> Bool {
        guard let config = RingStore.loadConfig() else {
            RingStore.recordAutomationRun(verdict: .disarmed)
            return false
        }
        let verdict = MessageMatcher.evaluate(config, body: message, sender: sender)
        RingStore.recordAutomationRun(verdict: verdict)
        guard verdict == .ring else { return false }
        RingEngine.shared.start(
            durationSeconds: config.durationSeconds,
            vibrate: config.vibrate,
            reason: "shortcut",
            sender: sender.map(MessageMatcher.maskSender)
        )
        return true
    }
}
