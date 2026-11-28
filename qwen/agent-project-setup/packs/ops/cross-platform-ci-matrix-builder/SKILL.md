---
name: cross-platform-ci-matrix-builder
description: Generates GitHub Actions or GitLab CI pipelines for multi-architecture builds, caching, and automated release artifacts. Supports Rust, Go, Node.js, and generic compiled languages with matrix strategies, layer caching, and release pipeline automation. Use when a project needs builds for several operating systems or architectures, cached CI, or automated release artifacts. Not for general workflow design (use ci-cd-pipelines).
license: MIT
metadata:
  domain: software-development
  subdomain: ci-cd
  tags: ci-cd, github-actions, gitlab-ci, multi-architecture, caching, release-artifacts, matrix-strategy
  version: '1'
  nist_csf: EV.AL-01, PL.PR-03
  mitre_attack: T1548.001
---
# Cross-Platform CI Matrix Builder

## When to Use
- Setting up CI for projects targeting multiple operating systems and architectures
- Adding cross-compilation support to existing pipelines
- Optimizing build times with caching strategies
- Automating release asset generation and distribution
- Migrating from one CI system to another

## Prerequisites
- Access to GitHub or GitLab repository
- Defined target platforms/architectures
- Release signing keys and credentials (managed securely)
- Container registry access (Docker Hub, GHCR, GitLab Container Registry)
- Target binary output directories and naming conventions

## Required Tools
| Tool | Purpose |
|------|---------|
| `github-cli` (gh) | GitHub Actions workflow dispatch |
| `gitlab-cli` (glab) | GitLab CI pipeline triggers |
| `crane` or `crictl` | Container image operations |
| `goreleaser` | (Go) Release automation |
| `cross` or `maturin` | (Rust) Cross-compilation helper |
| `act` | Local GitHub Actions testing |

## Workflow

### Step 1: Define Target Platform Matrix
Specify the combination of operating systems, architectures, and toolchains to build against.

**Supported platforms:**

| OS | Architectures | Notes |
|-----|-------------|-------|
| Ubuntu | amd64, arm64, armhf | Primary Linux target |
| macOS | amd64, arm64 | Intel Macs and Apple Silicon |
| Windows | amd64 | Primary Windows target |
| Alpine | amd64, arm64 | Musl libc variant |
| Fedora | amd64, arm64 | DNF-based distro |
| Android | arm64, armv7l | NDK-based cross-compilation |

**Matrix definition examples:**

```yaml
# GitHub Actions matrix
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    architecture: [x64, arm64]

# Custom matrix for cross-compilation
platforms:
  - os: linux
    arch: amd64
    target: x86_64-unknown-linux-gnu
  - os: linux
    arch: arm64
    target: aarch64-unknown-linux-gnu
  - os: macos
    arch: arm64
    target: aarch64-apple-darwin
  - os: windows
    arch: amd64
    target: x86_64-pc-windows-gnu
```

### Step 2: Generate GitHub Actions Workflow
Create `.github/workflows/ci.yml` with multi-architecture build, caching, and release pipeline.

**Full GitHub Actions workflow template:**

```yaml
name: Cross-Platform CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * 1'  # Weekly Monday build

env:
  # Core environment variables
  CARGO_TERM_COLOR: always
  RUST_LOG: info
  # Release configuration
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  # Optional: Release signing
  RELEASE_SIGN_KEY: ${{ secrets.RELEASE_SIGN_KEY }}
  RELEASE_PASSPHRASE: ${{ secrets.RELEASE_PASSPHRASE }}

jobs:
  # Matrix job for cross-platform builds
  build:
    name: Build ${{ matrix.os }} / ${{ matrix.architecture }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        architecture: [x64, arm64]
        exclude:
          - os: windows-latest
            architecture: arm64  # Windows on ARM not supported
    defaults:
      run:
        shell: ${{ matrix.shell || 'bash' }}

    # -------- Step 1: Checkout code --------
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for git tags

      - name: Setup QEMU (for multi-arch)
        if: matrix.os != 'windows-latest'
        uses: microsoft/setup-qemu-action@v3
        with:
          # qemu versions matching each platform
          versions: 'v8.2.0'

      - name: Setup GitHub Actions runner OS
        if: matrix.os == 'ubuntu-latest'
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: ${{ matrix.target || 'x86_64-unknown-linux-gnu' }}

      - name: Setup Rust toolchain (macOS)
        if: matrix.os == 'macos-latest'
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: ${{ matrix.target || 'aarch64-apple-darwin' }}
          # Enable nightly features if needed
          override: true

      - name: Setup MSVC (Windows)
        if: matrix.os == 'windows-latest'
        uses: ilamn/mkusubelix@v1
        with:
          # Windows SDK setup
          msvc_version: '193'

      - name: Cache cargo registry
        uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}-${{ matrix.architecture }}
          restore-keys: |
            ${{ runner.os }}-cargo-

      - name: Cache build artifacts
        uses: actions/cache@v4
        with:
          path: |
            target
            target/debug
            target/release
          key: ${{ runner.os }}-build-${{ hashFiles('**/*.rs') }}-${{ matrix.architecture }}
          restore-keys: |
            ${{ runner.os }}-build-

    # -------- Step 2: Build for target platform --------
    steps:
      - name: Build binary
        run: |
          if [ "${{ matrix.os }}" = "windows-latest" ]; then
            cargo build --release --target x86_64-pc-windows-gnu
          elif [ "${{ matrix.os }}" = "macos-latest" ]; then
            cargo build --release --target aarch64-apple-darwin
          else
            cargo build --release --target x86_64-unknown-linux-gnu
          fi

      - name: Verify binary
        run: |
          ./target/release/<binary_name>
          file ./target/release/<binary_name>

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.os }}-${{ matrix.architecture }}-binary
          path: target/release/*

    # -------- Step 3: Test (if applicable) --------
    steps:
      - name: Run unit tests
        run: cargo test --all-targets

      - name: Integration test smoke test
        run: |
          # Test binary runs on target platform
          ./${{ runner.os == 'windows-latest' && '.\target\release\<binary_name>.exe' || './target/release/<binary_name>' }}

    # -------- Step 4: Release pipeline (on main tag) --------
    - name: Create GitHub Release
      if: github.ref == 'refs/tags/v*' && github.event_name == 'push'
      uses: softprops/action-gh-release@v2
      with:
        tag_name: ${{ github.ref_name }}
        name: Release ${{ github.ref_name }}
        body: |
          ## Cross-Platform Release ${{ github.ref_name }}
          
          ### Built on:
          - Linux x64, arm64
          - macOS arm64, amd64
          - Windows x64
          
          ### SHA256 checksums
          - Linux x64: `<checksum>`
          - macOS arm64: `<checksum>`
          - Windows x64: `<checksum>`
        
          ### Assets
          - <binary-linux-x64>
          - <binary-mac-arm64>
          - <binary-windows-x64>
        files: |
          target/release/<binary_name>-linux-x64
          target/release/<binary_name>-macos-arm64
          target/release/<binary_name>-windows-x64.exe

  # Optional: Publish container images
  publish-container:
    needs: build
    if: github.ref == 'refs/tags/v*'
    runs-on: ubuntu-latest
    steps:
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push multi-arch image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:latest
            ghcr.io/${{ github.repository }}:${{ github.ref_name }}
          platforms: |
            linux/amd64
            linux/arm64
            linux/arm/v7
          cache-from: type=registry,ref=ghcr.io/${{ github.repository }}/buildcache
          cache-to: type=registry,ref=ghcr.io/${{ github.repository }}/buildcache,mode=max

  # Optional: Deploy to cloud
  deploy:
    needs: publish-container
    if: github.ref == 'refs/tags/v*'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v4
        with:
          namespace: default
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
          images: |
            ghcr.io/${{ github.repository }}:${{ github.ref_name }}