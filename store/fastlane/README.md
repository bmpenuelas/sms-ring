fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android listing

```sh
[bundle exec] fastlane android listing
```

Upload the Google Play listing text (title, short and full description) in every language

### android listing_with_images

```sh
[bundle exec] fastlane android listing_with_images
```

Upload the listing text plus app icon, feature graphics and phone screenshots (build them first)

----


## iOS

### ios listing

```sh
[bundle exec] fastlane ios listing
```

Upload the App Store listing text (name, subtitle, description, keywords, promotional text) in every language

### ios listing_with_images

```sh
[bundle exec] fastlane ios listing_with_images
```

Upload the listing text plus screenshots (replacing the current ones) and app previews (build them first)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
