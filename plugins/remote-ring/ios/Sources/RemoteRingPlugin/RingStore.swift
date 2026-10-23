import Foundation

/// Same shape as RingConfig in src/definitions.ts.
public struct RingConfig: Codable, Equatable {
    public var version: Int = 1
    public var armed: Bool = true
    public var passphrase: String = ""
    public var senders: [String] = []
    public var durationSeconds: Int = 60
    public var vibrate: Bool = true
    public var overrideDnd: Bool = true
    /// Bundled tone id (src/core/config.ts TONES). "system" has no iOS equivalent and plays the default.
    public var tone: String = RingConfig.defaultTone
    /// Percent of full volume (the Shortcuts automation sets the system volume to 100%).
    public var volume: Int = RingConfig.maxVolume
    /// Android only (chat-app notifications); kept so the shape matches.
    public var chatApps: Bool = false

    public static let defaultTone = "beacon"
    public static let tones = ["beacon", "chime", "pulse", "siren", "bells", "system"]
    public static let minDuration = 5
    public static let maxDuration = 600
    public static let maxSenders = 10
    public static let minVolume = 10
    public static let maxVolume = 100

    public init() {}

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        armed = (try? c.decode(Bool.self, forKey: .armed)) ?? true
        passphrase = (try? c.decode(String.self, forKey: .passphrase)) ?? ""
        senders = Array(((try? c.decode([String].self, forKey: .senders)) ?? [])
            .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
            .prefix(Self.maxSenders))
        let duration = (try? c.decode(Int.self, forKey: .durationSeconds)) ?? 60
        durationSeconds = max(Self.minDuration, min(Self.maxDuration, duration))
        vibrate = (try? c.decode(Bool.self, forKey: .vibrate)) ?? true
        overrideDnd = (try? c.decode(Bool.self, forKey: .overrideDnd)) ?? true
        let decodedTone = (try? c.decode(String.self, forKey: .tone)) ?? Self.defaultTone
        tone = Self.tones.contains(decodedTone) ? decodedTone : Self.defaultTone
        volume = max(Self.minVolume, min(Self.maxVolume, (try? c.decode(Int.self, forKey: .volume)) ?? Self.maxVolume))
        chatApps = (try? c.decode(Bool.self, forKey: .chatApps)) ?? false
    }

    /// The bundled sound file for a tone id ("beacon" keeps its original name).
    public static func toneURL(_ id: String) -> URL? {
        let name = id == "beacon" || id == "system" || !tones.contains(id) ? "remote_ring_tone" : "tone_\(id)"
        return Bundle.module.url(forResource: name, withExtension: "wav")
            ?? Bundle.module.url(forResource: "remote_ring_tone", withExtension: "wav")
    }
}

public struct TriggerRecord: Codable {
    public let at: Double
    public let reason: String
    public let sender: String?
}

public struct AutomationRun: Codable {
    public let at: Double
    public let verdict: String
}

/// App-private files in Application Support, excluded from iCloud/iTunes
/// backups and readable after first unlock (so a locked phone can still ring).
/// Nothing here ever leaves the device.
public enum RingStore {

    private static let queue = DispatchQueue(label: "app.smsring.remotering.store")
    private static let historyLimit = 20

    private static var directory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        var dir = base.appendingPathComponent("RemoteRing", isDirectory: true)
        if !FileManager.default.fileExists(atPath: dir.path) {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true, attributes: [
                .protectionKey: FileProtectionType.completeUntilFirstUserAuthentication
            ])
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try? dir.setResourceValues(values)
        }
        return dir
    }

    private static func url(_ name: String) -> URL { directory.appendingPathComponent(name) }

    private static func read<T: Decodable>(_ type: T.Type, _ name: String) -> T? {
        queue.sync {
            guard let data = try? Data(contentsOf: url(name)) else { return nil }
            return try? JSONDecoder().decode(T.self, from: data)
        }
    }

    private static func write<T: Encodable>(_ value: T, _ name: String) {
        queue.sync {
            guard let data = try? JSONEncoder().encode(value) else { return }
            var target = url(name)
            try? data.write(to: target, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try? target.setResourceValues(values)
        }
    }

    public static func loadConfig() -> RingConfig? { read(RingConfig.self, "config.json") }
    public static func saveConfig(_ config: RingConfig) { write(config, "config.json") }

    public static func loadHistory() -> [TriggerRecord] { read([TriggerRecord].self, "history.json") ?? [] }

    public static func addHistory(reason: String, sender: String?) {
        let record = TriggerRecord(at: Date().timeIntervalSince1970 * 1000, reason: reason, sender: sender)
        write(Array(([record] + loadHistory()).prefix(historyLimit)), "history.json")
    }

    public static func clearHistory() { write([TriggerRecord](), "history.json") }

    public static func lastAutomationRun() -> AutomationRun? { read(AutomationRun.self, "automation.json") }

    public static func recordAutomationRun(verdict: MessageMatcher.Verdict) {
        write(AutomationRun(at: Date().timeIntervalSince1970 * 1000, verdict: verdict.rawValue), "automation.json")
    }
}
