package app.smsring.remotering;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Decides whether a message should ring. A line-by-line port of
 * src/core/normalize.ts and src/core/matcher.ts: both must give the same
 * answer for every input (see docs/MATCHING.md and test-fixtures/matching.json).
 */
public final class MessageMatcher {

    public enum Verdict { RING, VIBRATE_ONLY, DISARMED, WEAK_PASSPHRASE, NO_PASSPHRASE, SENDER_NOT_ALLOWED }

    public static final int MIN_NORMALIZED_PASSPHRASE = 6;
    public static final int SENDER_SUFFIX_DIGITS = 9;

    private static final Pattern MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern INVISIBLE = Pattern.compile("[\\s\\p{Z}\\p{Cf}]+");
    private static final Pattern NOT_LETTER_OR_DIGIT = Pattern.compile("[^\\p{L}\\p{N}]+");
    private static final Pattern NON_DIGITS = Pattern.compile("\\D+");
    private static final Pattern ANY_LETTER = Pattern.compile("\\p{L}");
    private static final Pattern ONLY_DIGITS = Pattern.compile("\\d+");

    private MessageMatcher() {}

    private static String fold(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        return MARKS.matcher(Normalizer.normalize(lower, Normalizer.Form.NFKD)).replaceAll("");
    }

    /** Lowercase, NFKD, no accents, no whitespace. Punctuation is kept. */
    public static String normalizePhrase(String text) {
        if (text == null) return "";
        return INVISIBLE.matcher(fold(text)).replaceAll("");
    }

    /** Quote marks that may wrap a message: straight, curly, low, guillemets and CJK corner brackets. */
    private static final String QUOTES = "\"'`\u201C\u201D\u201E\u201F\u2018\u2019\u201A\u201B\u00AB\u00BB\u2039\u203A\u300C\u300D\u300E\u300F\u301D\u301E\u301F";

    /** Drops one pair of quotes wrapping an already normalized message. */
    public static String unquote(String normalized) {
        int last = normalized.length() - 1;
        if (last >= 1 && QUOTES.indexOf(normalized.charAt(0)) >= 0 && QUOTES.indexOf(normalized.charAt(last)) >= 0) {
            return normalized.substring(1, last);
        }
        return normalized;
    }

    /** Letters and digits only (alphanumeric sender IDs). */
    public static String normalizeKey(String text) {
        if (text == null) return "";
        return NOT_LETTER_OR_DIGIT.matcher(fold(text)).replaceAll("");
    }

    public static String normalizeSender(String sender) {
        if (sender == null) return "";
        String digits = NON_DIGITS.matcher(sender).replaceAll("");
        if (digits.length() >= 3 && !ANY_LETTER.matcher(sender).find()) return digits;
        return normalizeKey(sender);
    }

    public static boolean sendersMatch(String allowed, String actual) {
        String a = normalizeSender(allowed);
        String b = normalizeSender(actual);
        if (a.isEmpty() || b.isEmpty()) return false;
        if (!ONLY_DIGITS.matcher(a).matches() || !ONLY_DIGITS.matcher(b).matches()) return a.equals(b);
        if (Math.min(a.length(), b.length()) < 7) return a.equals(b);
        int n = Math.min(SENDER_SUFFIX_DIGITS, Math.min(a.length(), b.length()));
        return a.substring(a.length() - n).equals(b.substring(b.length() - n));
    }

    public static String maskSender(String sender) {
        if (sender == null) return "••••";
        String s = sender.trim();
        if (s.length() <= 4) return "••••";
        return "•••• " + s.substring(s.length() - 4);
    }

    /** The whole message must be the passphrase; only spaces, capitals, accents and wrapping quotes may differ. */
    public static Verdict evaluate(boolean armed, String passphrase, List<String> senders, String body, String sender) {
        return evaluate(armed, passphrase, senders, body, sender, false, "");
    }

    /** Whole message or individually quoted parts, with an optional outer quote pair. */
    private static boolean matchesParts(String message, String first, String second) {
        for (String candidate : new String[] {message, unquote(message)}) {
            for (int length : new int[] {first.length(), first.length() + 2}) {
                if (length > candidate.length()) continue;
                String left = candidate.substring(0, length);
                String right = candidate.substring(length);
                if ((left.equals(first) || unquote(left).equals(first)) &&
                    (right.equals(second) || unquote(right).equals(second))) return true;
            }
        }
        return false;
    }

    public static Verdict evaluate(boolean armed, String passphrase, List<String> senders, String body, String sender,
                                   boolean vibrateOnlyEnabled, String vibrateOnlyPhrase) {
        String phrase = normalizePhrase(passphrase);
        if (phrase.length() < MIN_NORMALIZED_PASSPHRASE) return Verdict.WEAK_PASSPHRASE;
        String message = normalizePhrase(body);
        boolean regular = message.equals(phrase) || unquote(message).equals(phrase);
        String modifier = normalizePhrase(vibrateOnlyPhrase);
        boolean vibrateOnly = !regular && vibrateOnlyEnabled && !modifier.isEmpty() &&
            (matchesParts(message, phrase, modifier) || matchesParts(message, modifier, phrase));
        if (!regular && !vibrateOnly) return Verdict.NO_PASSPHRASE;
        boolean anyAllowed = false;
        boolean matched = false;
        for (String allowed : senders) {
            if (allowed == null || allowed.trim().isEmpty()) continue;
            anyAllowed = true;
            if (sendersMatch(allowed, sender)) {
                matched = true;
                break;
            }
        }
        if (anyAllowed && !matched) return Verdict.SENDER_NOT_ALLOWED;
        if (!armed) return Verdict.DISARMED;
        return vibrateOnly ? Verdict.VIBRATE_ONLY : Verdict.RING;
    }
}
