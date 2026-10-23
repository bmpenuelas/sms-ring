// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorRemoteRing",
    defaultLocalization: "en",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorRemoteRing",
            targets: ["RemoteRingPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "RemoteRingPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/RemoteRingPlugin",
            resources: [.process("Resources")]),
        .testTarget(
            name: "RemoteRingPluginTests",
            dependencies: ["RemoteRingPlugin"],
            path: "ios/Tests/RemoteRingPluginTests")
    ]
)
