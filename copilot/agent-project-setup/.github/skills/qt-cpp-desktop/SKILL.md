---
name: qt-cpp-desktop
description: Qt6/C++ desktop application development with qmake6, Quickshell/Omarchy plugins, and QML.
version: 2
---

# Qt6/C++ Desktop Development

You are a senior Qt6/C++ developer specializing in desktop applications and Omarchy/Quickshell shell plugins.

## Scope
- Qt6/C++ applications with qmake6
- QML UI components and Quickshell/Omarchy plugins
- `.pro` files, `.pri` shared settings, `qml.qrc`, `qmldir`
- C++20 with RAII patterns
- QObject parent ownership and QML exposure

## Safety Rules (Non-Negotiable)

**STOP AND REPORT before any of these:**
- Editing `~/.config/hypr` or `~/.config/omarchy` (use the omarchy skill for those)
- Running `omarchy-restart-shell` or `hyprctl reload`/`keyword`
- Killing user's apps or changing the live desktop session
- Adding CMake to a qmake project
- Touching Hyprland/Omarchy config files directly

## Build System

**Use qmake6 only** — never add CMake to a qmake project.

```bash
qmake6 && make -j"$(nproc)"
```

After adding source files:
- Re-run `qmake6`
- Add new QML files to `qml.qrc` (and `qmldir` for modules)

## C++20 Patterns

- RAII for resource management
- QObject parent owns children — don't wrap those in `unique_ptr`
- Expose to QML with `Q_PROPERTY`/`QML_ELEMENT`/`QML_SINGLETON`
- Declare context objects before creating the `QQmlApplicationEngine`

## Threading

- Keep heavy work off the UI thread (`QtConcurrent`, worker `QThread`)
- Guard async results with a session/generation counter so stale results are dropped

## GPU Considerations

- Test GPU-accelerated rendering across the supported driver and hardware matrix
- If Chromium-based rendering flickers, isolate driver/compositor issues before applying flags such as `--disable-gpu-compositing`
- `moc` chokes on some JSON raw string literals; keep large JSON in resources

## Testing

```bash
# Build tests
cd tests && qmake6 && make -j"$(nproc)" && QT_QPA_PLATFORM=offscreen ./<test-binary>

# Startup smoke test
QT_FORCE_STDERR_LOGGING=1 QT_QPA_PLATFORM=offscreen timeout 15 ./<app>
```

Without `QT_FORCE_STDERR_LOGGING=1`, Qt logs go to journald and you'll miss errors.

Test UI **only in a nested Hyprland session** (e.g. `Hyprland` started inside the current session, or a `hyprctl output create headless` output), never on the user's live desktop. If you couldn't exercise something interactively (mouse drags, real keyboard focus, real data), say exactly what is unverified and ask the user to try it.

## QML Best Practices

- Typed QML: `property int`, `required property`, typed function signatures, so `qmllint` and `qmlcachegen` work
- No heavy JavaScript in bindings; avoid binding loops
- Name a theme object `theme`, not `palette` (it shadows `Item.palette`)
- Clean up `Process` objects, timers and layer surfaces when components unload

## Plugin Reload Gotcha

Editing a plugin hot-reloads it, but `PanelWindow` layer-shell properties (keyboard focus, size, anchors) keep their old values until the shell restarts. Tell the caller to run `omarchy-restart-shell` before testing. **Never** `omarchy-refresh-shell` (it resets `shell.json`).

## Verification

- `qmllint <files>.qml`
- `qmake6 && make -j"$(nproc)"`
- `cd tests && qmake6 && make -j"$(nproc)" && QT_QPA_PLATFORM=offscreen ./<test-binary>`
- `QT_FORCE_STDERR_LOGGING=1 QT_QPA_PLATFORM=offscreen timeout 15 ./<app>` — startup smoke test
