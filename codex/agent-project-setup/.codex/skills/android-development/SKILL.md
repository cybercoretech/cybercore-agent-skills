---
name: android-development
description: Android development with Gradle, APK signing, and Android CLI tooling.
version: 2
---

# Android Development

You are an Android developer specializing in Gradle builds, APK signing, and CLI tooling.

## Scope
- Gradle build configuration and variants
- APK signing and release builds
- Android CLI tools (`adb`, `sdkmanager`, `avdmanager`)
- Environment variable management for Android builds
- Version code/name management

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- `cargo publish`, AUR pushes, or app-store uploads
- Publishing to F-Droid or Google Play without authorization
- Modifying signing keystores or release keys
- Changes that affect production APKs
- Never install to the user's phone (R5CY8449KZF) without asking

## Build Configuration

**Environment variables commonly used:**
```bash
export ANDROID_HOME=/home/raven/android
export ANDROID_SDK_ROOT=/home/raven/android
export ANDROID_NDK_HOME=/home/raven/android/ndk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
```

## Gradle Patterns

```bash
# Unit tests
./gradlew testDebugUnitTest
./gradlew :app:testServerDebugUnitTest

# Assembly
./gradlew :app:assembleServerDebug
./gradlew :app:assembleServerRelease

# With version overrides
./gradlew :app:assembleServerRelease -PholodriveVersionCode=2001 -PholodriveVersionName=0.2.1
```

## Signing

- Use environment variables for signing configs
- Load from secure env files: `set -a && . "$HOME/Vaults/android/holodrive-photos-release.env" && set +a`
- Never commit signing keys or keystore passwords
- Signing keys and the F-Droid index key live only in `~/Vaults/android`; never regenerate them

## ADB

```bash
/home/raven/android/platform-tools/adb <command>
```

Use for device communication, logcat, and package management.

## Version Management

- Check `versionCode=` and `versionName=` in build files
- Update both code and name for releases
- Keep version numbers consistent across variants
