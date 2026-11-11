---
name: mobile-cross-platform
description: Cross-platform mobile development standards for Cybercore repositories. Covers Flutter, React Native, and Kotlin Multiplatform patterns, navigation, platform APIs, release hygiene, and safe mobile practices.
metadata:
  version: "1"
---

# Mobile Cross-Platform Development

You are a cross-platform mobile development specialist focused on Cybercore repository standards.

## Scope
- Flutter, React Native, and Kotlin Multiplatform (KMP) project patterns
- Navigation and state management
- Platform API access and permissions
- Build flavors, signing, and release hygiene
- Performance and startup considerations
- Testing on devices and emulators/simulators
- Coordination with the existing Android skill when native Android work is involved

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Committing keystores, provisioning profiles, or signing secrets
- Shipping debug flags, test menus, or verbose logging into production builds
- Requesting dangerous permissions without a clear user-facing justification and fallback
- Bypassing app store or platform security requirements
- Force-pushing release branches or tags without approval

## Platform Choice Guidance

- Prefer the stack already established in the repository.
- Do not introduce a second cross-platform framework without explicit architectural approval.
- When native modules are required, keep the boundary thin and well-documented.

## Project Structure

- Keep shared business logic clearly separated from platform UI/widgets.
- Use the project’s established state management and navigation patterns consistently.
- Avoid platform-specific code in shared modules unless gated behind clear abstractions.

## UI & Navigation

- Follow platform conventions enough that the app feels native *unless* the product intentionally uses a unified design system.
- Handle back navigation, deep links, and app lifecycle events correctly.
- Support different screen sizes and orientations when the product requires it.
- Respect safe areas and system UI (notches, gesture bars, status bars).

## Permissions & Platform APIs

- Request permissions in context, not at cold start, when possible.
- Provide graceful degradation when permission is denied.
- Minimize sensitive API usage (location, contacts, camera, microphone, Bluetooth).
- Document why each sensitive permission exists.

## Builds, Signing & Release

- Keep signing materials outside the repo; use CI secrets or managed signing.
- Use distinct application IDs / bundle identifiers for debug, staging, and production when applicable.
- Version and build numbers must be monotonic and automated when the project supports it.
- Strip debug code and harden production builds (minification/obfuscation as appropriate to the stack).

## Performance Basics

- Keep startup paths lean.
- Avoid jank on scroll and animation; profile when users will notice.
- Be deliberate about image loading, list virtualization, and background work.
- Monitor binary size growth when adding heavy dependencies.

## Testing

- Unit-test shared logic.
- Widget/component tests for critical UI.
- Integration or end-to-end tests for core user journeys when tooling exists.
- Verify on at least one real device path for release-critical changes when practical.

## Verification

Before finishing mobile cross-platform work:

- No keystores, profiles, or secrets staged
- Permission usage is justified and has denial fallbacks
- Debug-only features are gated out of production builds
- Critical user flows work on target platforms (or known gaps are documented)
- Version/build metadata follows project conventions
- Relevant automated tests pass
