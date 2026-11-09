import AppIntents
import RemoteRingPlugin

// iOS does not let any app read SMS. Instead, an Apple Shortcuts automation
// ("When I get a message containing …") passes the message to this intent,
// which checks it on the device and rings. AudioPlaybackIntent lets the
// intent start audio in the background without opening the app.
//
// iOS refuses an automation whose Sender and Message Contains are both empty,
// so the user types the "ring" word of their language in Message Contains and
// every message to send starts with it. The matcher ignores that word (and all
// punctuation) around the passphrase: see docs/MATCHING.md.

struct RingIfPassphraseIntent: AudioPlaybackIntent {
    static let title: LocalizedStringResource = "Ring if passphrase matches"
    static let description = IntentDescription(
        "Rings your phone at full volume when the message contains your SMS Ring passphrase. Checked on this device; nothing is sent anywhere."
    )
    static let openAppWhenRun = false
    /// Listed in Shortcuts under the app's actions (search "SMS Ring").
    static let isDiscoverable = true

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
