import Foundation

/// Decides whether a message should ring. A line-by-line port of
/// src/core/normalize.ts and src/core/matcher.ts: both must give the same
/// answer for every input (see docs/MATCHING.md and test-fixtures/matching.json).
public enum MessageMatcher {

    public enum Verdict: String {
        case ring
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

    /// Matches JS `[\s\p{Z}\p{Cf}]` and Java `[\s\p{Z}\p{Cf}]`.
    private static func isInvisible(_ s: Unicode.Scalar) -> Bool {
        if (9...13).contains(s.value) || s.value == 32 { return true }
        switch s.properties.generalCategory {
        case .spaceSeparator, .lineSeparator, .paragraphSeparator, .format: return true
        default: return false
        }
    }

    private static func fold(_ text: String) -> String.UnicodeScalarView {
        text.lowercased().decomposedStringWithCompatibilityMapping.unicodeScalars
    }

    /// Lowercase, NFKD, no accents, no whitespace. Punctuation is kept.
    public static func normalizePhrase(_ text: String) -> String {
        var out = String.UnicodeScalarView()
        for s in fold(text) where !isMark(s) && !isInvisible(s) { out.append(s) }
        return String(out)
    }

    /// Quote marks that may wrap a message: straight, curly, low, guillemets and CJK corner brackets.
    private static let quotes: Set<UInt32> = [
        0x22, 0x27, 0x60, 0x201C, 0x201D, 0x201E, 0x201F, 0x2018, 0x2019, 0x201A, 0x201B,
        0xAB, 0xBB, 0x2039, 0x203A, 0x300C, 0x300D, 0x300E, 0x300F, 0x301D, 0x301E, 0x301F,
    ]

    /// Drops one pair of quotes wrapping an already normalized message.
    public static func unquote(_ normalized: String) -> String {
        let scalars = Array(normalized.unicodeScalars)
        guard scalars.count >= 2, quotes.contains(scalars[0].value), quotes.contains(scalars[scalars.count - 1].value) else { return normalized }
        var out = String.UnicodeScalarView()
        out.append(contentsOf: scalars[1..<(scalars.count - 1)])
        return String(out)
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

    /// The whole message must be the passphrase; only spaces, capitals, accents and wrapping quotes may differ.
    /// `sender == nil` means the trigger could not tell (a Shortcuts automation
    /// without the Sender variable): only allowed when no senders are configured.
    public static func evaluate(_ config: RingConfig, body: String, sender: String?) -> Verdict {
        let phrase = normalizePhrase(config.passphrase)
        if phrase.utf16.count < minNormalizedPassphrase { return .weakPassphrase }
        // Code-unit comparison, like === in JS and String.equals in Java.
        let message = normalizePhrase(body)
        let expected = Array(phrase.utf16)
        if Array(message.utf16) != expected && Array(unquote(message).utf16) != expected { return .noPassphrase }
        let allowed = config.senders.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        if !allowed.isEmpty {
            guard let sender, allowed.contains(where: { sendersMatch($0, sender) }) else { return .senderNotAllowed }
        }
        return config.armed ? .ring : .disarmed
    }
}
