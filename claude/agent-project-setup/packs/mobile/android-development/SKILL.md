---
name: android-development
description: Native Android development with Gradle, the Android SDK and command-line tools, APK and AAB signing, and release builds. Use when building, signing, debugging or releasing a native Android app, editing Gradle files, or running adb and emulator tasks. Not for Flutter, React Native or Kotlin Multiplatform apps (use mobile-cross-platform).
metadata:
  version: "3"
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
- Never install, flash, or modify a connected physical device without explicit user approval

## Build Configuration

**Environment variables commonly used:**
```bash
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}"
export ANDROID_HOME="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
export ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-$ANDROID_SDK_ROOT/ndk}"
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
./gradlew :app:assembleServerRelease -PappVersionCode=<code> -PappVersionName=<version>
```

## Signing

- Use environment variables for signing configs
- Load signing configuration from a secure, user-managed environment file
- Never commit signing keys or keystore passwords
- Keep signing keys and release-index keys in secure storage; never regenerate or commit them without explicit approval

## ADB

```bash
"$ANDROID_SDK_ROOT/platform-tools/adb" <command>
```

Use for device communication, logcat, and package management.

## Version Management

- Check `versionCode=` and `versionName=` in build files
- Update both code and name for releases
- Keep version numbers consistent across variants
