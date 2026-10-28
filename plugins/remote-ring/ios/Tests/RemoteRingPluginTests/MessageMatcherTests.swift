import XCTest
@testable import RemoteRingPlugin

/// Runs the vectors shared with the TypeScript and Java matchers.
final class MessageMatcherTests: XCTestCase {

    private func fixtures() throws -> [String: Any] {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("test-fixtures/matching.json")
        return try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]
    }

    func testNormalizePhrase() throws {
        for c in try fixtures()["normalizePhrase"] as! [[String]] {
            XCTAssertEqual(MessageMatcher.normalizePhrase(c[0]), c[1], c[0])
        }
    }

    func testSendersMatch() throws {
        for c in try fixtures()["sendersMatch"] as! [[Any]] {
            XCTAssertEqual(MessageMatcher.sendersMatch(c[0] as! String, c[1] as! String), c[2] as! Bool, "\(c)")
        }
    }

    func testEvaluate() throws {
        for c in try fixtures()["evaluate"] as! [[String: Any]] {
            let raw = c["config"] as! [String: Any]
            let config = try JSONDecoder().decode(RingConfig.self, from: JSONSerialization.data(withJSONObject: raw))
            let verdict = MessageMatcher.evaluate(config, body: c["body"] as! String, sender: c["sender"] as? String)
            XCTAssertEqual(verdict.rawValue, c["verdict"] as! String, c["body"] as! String)
        }
    }

    func testVibrationConfigRoundTrip() throws {
        var config = RingConfig()
        config.passphrase = "blue tiger moon"
        config.vibrateOnlyEnabled = true
        config.vibrateOnlyPhrase = "hush please"
        config.vibrate = false
        let restored = try JSONDecoder().decode(RingConfig.self, from: JSONEncoder().encode(config))
        XCTAssertEqual(restored, config)
        XCTAssertEqual(MessageMatcher.evaluate(restored, body: "hush please 'blue tiger moon'", sender: nil), .vibrateOnly)
        XCTAssertEqual(MessageMatcher.evaluate(restored, body: "blue tiger moon", sender: nil), .ring)
        let old = try JSONDecoder().decode(RingConfig.self, from: Data("{}".utf8))
        XCTAssertTrue(old.vibrateOnlyEnabled)
        XCTAssertTrue(RingConfig().vibrateOnlyEnabled)
        config.vibrateOnlyEnabled = false
        let disabled = try JSONDecoder().decode(RingConfig.self, from: JSONEncoder().encode(config))
        XCTAssertFalse(disabled.vibrateOnlyEnabled)
    }
}
