package com.logicedge.smsring.remotering;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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
    /** Whitespace, separators, invisible characters, all punctuation (every kind of quote) and symbols. */
    private static final Pattern IGNORED = Pattern.compile("[\\s\\p{Z}\\p{Cf}\\p{P}\\p{S}]+");
    private static final Pattern NOT_LETTER_OR_DIGIT = Pattern.compile("[^\\p{L}\\p{N}]+");
    private static final Pattern NON_DIGITS = Pattern.compile("\\D+");
    private static final Pattern ANY_LETTER = Pattern.compile("\\p{L}");
    private static final Pattern ONLY_DIGITS = Pattern.compile("\\d+");

    private MessageMatcher() {}

    private static String fold(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        return MARKS.matcher(Normalizer.normalize(lower, Normalizer.Form.NFKD)).replaceAll("");
    }

    /** Lowercase, NFKD, no accents, then no spaces, separators, quotes or other punctuation. */
    public static String normalizePhrase(String text) {
        if (text == null) return "";
        return IGNORED.matcher(fold(text)).replaceAll("");
    }

    /**
     * "ring" in every app language, the word an iPhone user types in the Shortcuts automation.
     * Allowed before or after the passphrase. Same list as RING_WORDS in src/core/matcher.ts.
     */
    public static final String[] RING_WORDS = {
        "ring", "suena", "toca", "sonne", "klingeln", "squilla", "bel", "dzwoni", "звонок", "çal",
        "رنين", "रिंग", "เรียกเข้า", "reo", "dering", "着信", "벨", "响铃", "響鈴",
    };

    private static final Set<String> NORMALIZED_RING_WORDS = new LinkedHashSet<>();

    static {
        for (String word : RING_WORDS) {
            String normalized = normalizePhrase(word);
            if (!normalized.isEmpty()) NORMALIZED_RING_WORDS.add(normalized);
        }
    }

    /** The message as is, and without a ring word at its start or at its end. */
    private static List<String> withoutRingWord(String message) {
        List<String> candidates = new ArrayList<>();
        candidates.add(message);
        for (String word : NORMALIZED_RING_WORDS) {
            if (message.length() <= word.length()) continue;
            if (message.startsWith(word)) candidates.add(message.substring(word.length()));
            if (message.endsWith(word)) candidates.add(message.substring(0, message.length() - word.length()));
        }
        return candidates;
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

    /** The whole message must be the passphrase; spaces, capitals, accents, punctuation, quotes and a ring word may differ. */
    public static Verdict evaluate(boolean armed, String passphrase, List<String> senders, String body, String sender) {
        return evaluate(armed, passphrase, senders, body, sender, false, "");
    }

    public static Verdict evaluate(boolean armed, String passphrase, List<String> senders, String body, String sender,
                                   boolean vibrateOnlyEnabled, String vibrateOnlyPhrase) {
        String phrase = normalizePhrase(passphrase);
        if (phrase.length() < MIN_NORMALIZED_PASSPHRASE) return Verdict.WEAK_PASSPHRASE;
        List<String> candidates = withoutRingWord(normalizePhrase(body));
        boolean regular = candidates.contains(phrase);
        String modifier = normalizePhrase(vibrateOnlyPhrase);
        boolean vibrateOnly = false;
        if (!regular && vibrateOnlyEnabled && !modifier.isEmpty()) {
            for (String candidate : candidates) {
                if (candidate.equals(phrase + modifier) || candidate.equals(modifier + phrase)) {
                    vibrateOnly = true;
                    break;
                }
            }
        }
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
