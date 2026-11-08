import Foundation

/// Decides whether a message should ring. A line-by-line port of
/// src/core/normalize.ts and src/core/matcher.ts: both must give the same
/// answer for every input (see docs/MATCHING.md and test-fixtures/matching.json).
public enum MessageMatcher {

    public enum Verdict: String {
        case ring
        case vibrateOnly = "vibrate-only"
        case disarmed
        case weakPassphrase = "weak-passphrase"
        case noPassphrase = "no-passphrase"
        case senderNotAllowed = "sender-not-allowed"
    }

    public static let minNormalizedPassphrase = 6
    public static let senderSuffixDigits = 9

    private static func isMark(_ s: Unicode.Scalar) -> Bool {
        switch s.properties.generalCategory {
        case .nonspacingMark, .spacingMark, .enclosingMark: return true
        default: return false
        }
    }

    private static func isLetterOrNumber(_ s: Unicode.Scalar) -> Bool {
        switch s.properties.generalCategory {
        case .uppercaseLetter, .lowercaseLetter, .titlecaseLetter, .modifierLetter, .otherLetter,
             .decimalNumber, .letterNumber, .otherNumber: return true
        default: return false
        }
    }

    /// Matches JS and Java `[\s\p{Z}\p{Cf}\p{P}\p{S}]`: whitespace, separators, invisible characters,
    /// all punctuation (every kind of quote) and symbols.
    private static func isIgnored(_ s: Unicode.Scalar) -> Bool {
        if (9...13).contains(s.value) || s.value == 32 { return true }
        switch s.properties.generalCategory {
        case .spaceSeparator, .lineSeparator, .paragraphSeparator, .format,
             .connectorPunctuation, .dashPunctuation, .openPunctuation, .closePunctuation,
             .initialPunctuation, .finalPunctuation, .otherPunctuation,
             .mathSymbol, .currencySymbol, .modifierSymbol, .otherSymbol: return true
        default: return false
        }
    }

    private static func fold(_ text: String) -> String.UnicodeScalarView {
        text.lowercased().decomposedStringWithCompatibilityMapping.unicodeScalars
    }

    /// Lowercase, NFKD, no accents, then no spaces, separators, quotes or other punctuation.
    public static func normalizePhrase(_ text: String) -> String {
        var out = String.UnicodeScalarView()
        for s in fold(text) where !isMark(s) && !isIgnored(s) { out.append(s) }
        return String(out)
    }

    /// "ring" in every app language, the word an iPhone user types in the Shortcuts automation.
    /// Allowed before or after the passphrase. Same list as RING_WORDS in src/core/matcher.ts.
    public static let ringWords = [
        "ring", "suena", "toca", "sonne", "klingeln", "squilla", "bel", "dzwoni", "звонок", "çal",
        "رنين", "रिंग", "เรียกเข้า", "reo", "dering", "着信", "벨", "响铃", "響鈴",
    ]

    private static let normalizedRingWords: [String] = {
        var seen = Set<String>()
        return ringWords.map(normalizePhrase).filter { !$0.isEmpty && seen.insert($0).inserted }
    }()

    /// The message as is, and without a ring word at its start or at its end (UTF-16 units, like JS and Java).
    private static func withoutRingWord(_ message: String) -> [String] {
        let units = Array(message.utf16)
        var candidates = [message]
        for word in normalizedRingWords {
            let w = Array(word.utf16)
            guard units.count > w.count else { continue }
            if Array(units[..<w.count]) == w { candidates.append(String(decoding: units[w.count...], as: UTF16.self)) }
            if Array(units[(units.count - w.count)...]) == w { candidates.append(String(decoding: units[..<(units.count - w.count)], as: UTF16.self)) }
        }
        return candidates
    }

    /// Letters and digits only (alphanumeric sender IDs).
    public static func normalizeKey(_ text: String) -> String {
        var out = String.UnicodeScalarView()
        for s in fold(text) where isLetterOrNumber(s) { out.append(s) }
        return String(out)
    }

    private static func asciiDigits(_ s: String) -> String {
        String(s.unicodeScalars.filter { $0.value >= 48 && $0.value <= 57 }.map(Character.init))
    }

    private static func hasLetter(_ s: String) -> Bool {
        s.unicodeScalars.contains { scalar in
            switch scalar.properties.generalCategory {
            case .uppercaseLetter, .lowercaseLetter, .titlecaseLetter, .modifierLetter, .otherLetter: return true
            default: return false
            }
        }
    }

    public static func normalizeSender(_ sender: String) -> String {
        let digits = asciiDigits(sender)
        if digits.count >= 3 && !hasLetter(sender) { return digits }
        return normalizeKey(sender)
    }

    public static func sendersMatch(_ allowed: String, _ actual: String) -> Bool {
        let a = normalizeSender(allowed)
        let b = normalizeSender(actual)
        if a.isEmpty || b.isEmpty { return false }
        let isNumeric: (String) -> Bool = { !$0.isEmpty && $0.unicodeScalars.allSatisfy { $0.value >= 48 && $0.value <= 57 } }
        if !isNumeric(a) || !isNumeric(b) { return a == b }
        if min(a.count, b.count) < 7 { return a == b }
        let n = min(senderSuffixDigits, a.count, b.count)
        return a.suffix(n) == b.suffix(n)
    }

    public static func maskSender(_ sender: String) -> String {
        let s = sender.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.count <= 4 { return "••••" }
        return "•••• " + s.suffix(4)
    }

    private static func sameUnits(_ a: String, _ b: String) -> Bool {
        Array(a.utf16) == Array(b.utf16)
    }

    /// The whole message must be the passphrase (spaces, capitals, accents, punctuation, quotes and a ring word may
    /// differ), optionally with the enabled vibration modifier.
    /// `sender == nil` means the trigger could not tell (a Shortcuts automation
    /// without the Sender variable): only allowed when no senders are configured.
    public static func evaluate(_ config: RingConfig, body: String, sender: String?) -> Verdict {
        let phrase = normalizePhrase(config.passphrase)
        if phrase.utf16.count < minNormalizedPassphrase { return .weakPassphrase }
        // Code-unit comparison, like === in JS and String.equals in Java.
        let candidates = withoutRingWord(normalizePhrase(body))
        let regular = candidates.contains { sameUnits($0, phrase) }
        let modifier = normalizePhrase(config.vibrateOnlyPhrase)
        let vibrateOnly = !regular && config.vibrateOnlyEnabled && !modifier.isEmpty &&
            candidates.contains { sameUnits($0, phrase + modifier) || sameUnits($0, modifier + phrase) }
        if !regular && !vibrateOnly { return .noPassphrase }
        let allowed = config.senders.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        if !allowed.isEmpty {
            guard let sender, allowed.contains(where: { sendersMatch($0, sender) }) else { return .senderNotAllowed }
        }
        if !config.armed { return .disarmed }
        return vibrateOnly ? .vibrateOnly : .ring
    }
}
