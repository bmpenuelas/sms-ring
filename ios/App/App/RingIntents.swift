import AppIntents
import RemoteRingPlugin

// iOS does not let any app read SMS. Instead, an Apple Shortcuts automation
// ("When I get a message containing …") passes the message to this intent,
// which checks it on the device and rings. AudioPlaybackIntent lets the
// intent start audio in the background without opening the app.

struct RingIfPassphraseIntent: AudioPlaybackIntent {
    static let title: LocalizedStringResource = "Ring if passphrase matches"
    static let description = IntentDescription(
        "Rings your phone at full volume when the message contains your SMS Ring passphrase. Checked on this iPhone; nothing is sent anywhere."
    )
    static let openAppWhenRun = false

    @Parameter(title: "Message", description: "The message text, usually Shortcut Input.")
    var message: String

    @Parameter(title: "Sender", description: "Optional: who sent it, required if you allowed only some senders.")
    var sender: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Ring if \(\.$message) has the passphrase") {
            \.$sender
        }
    }

    func perform() async throws -> some IntentResult & ReturnsValue<Bool> {
        .result(value: RingTrigger.handleAutomation(message: message, sender: sender))
    }
}

struct StopRingingIntent: AudioPlaybackIntent {
    static let title: LocalizedStringResource = "Stop ringing"
    static let description = IntentDescription("Stops SMS Ring if it is ringing.")
    static let openAppWhenRun = false
    /// Siri or Shortcuts on a locked phone ask to unlock first.
    static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication

    func perform() async throws -> some IntentResult {
        RingEngine.shared.stop()
        return .result()
    }
}

struct SmsRingShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: StopRingingIntent(),
            phrases: [
                "Stop \(.applicationName)",
                "Stop ringing with \(.applicationName)",
            ],
            shortTitle: "Stop ringing",
            systemImageName: "bell.slash"
        )
    }
}
