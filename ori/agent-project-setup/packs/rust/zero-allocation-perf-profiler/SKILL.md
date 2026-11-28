---
name: zero-allocation-perf-profiler
description: Guides the agent to benchmark hot paths, minimize heap allocations, and inspect assembly or flamegraphs for Rust code. Ensures performance-critical code is optimized for zero-allocation paths and profile-driven improvements. Use when a Rust hot path must get faster or allocate less, with benchmarks and profiles as evidence. Not for performance work outside Rust hot paths (use performance-optimization).
license: Apache-2.0
metadata:
  domain: software-development
  subdomain: rust-performance
  tags: rust, performance, profiling, benchmarking, heap-allocations, flamegraph, assembly, hot-paths
  version: '1'
  nist_csf: PR.4.1, PR.4.2, PR.Meas.1
  mitre_attack: T1059.007
---
# Zero-Allocation & Perf Profiler

## When to Use
- Before optimizing Rust performance-critical code paths
- When reviewing pull requests that affect hot loops or frequently-called functions
- During profiling-driven optimization cycles
- To audit existing code for unnecessary heap allocations
- When preparing for real-time or low-latency requirements

## Prerequisites
- Rust toolchain installed (rustup 1.75+ recommended)
- A Rust project with performance-critical code
- Profiling tools: `criterion`, `perf`, `flamegraph`, `perf-tools`
- Optional: `perf-map-agent` for assembly inspection
- Target architecture knowledge (x86_64, aarch64, etc.)

## Required Tools
| Tool | Purpose |
|------|---------|
| `cargo` | Rust package manager |
| `criterion` | Rust benchmarking framework |
| `perf` | Linux profiling infrastructure |
| `flamegraph` | Flamegraph visualization tools |
| `objdump` / `readelf` | Assembly inspection |
| `valgrind` | (Optional) heap profiling |
| `heaptrack` | (Optional) heap allocation tracking |

## Workflow

### Step 1: Benchmark Hot Paths with cargo criterion
Establish baseline performance metrics before optimization.

```bash
# Install criterion: cargo install criterion

# Add to Cargo.toml (dev dependency)
# [dev-dependencies]
# criterion = "0.4"

# Create benchmarks in benches/hotpath.rs
# use criterion::{black_box, criterion_main, Criterion};

# Run benchmarks
criterion --no-collapse

# Or with JSON output for later analysis
criterion --json > benchmark-results.json
```

**Benchmark patterns:**

| Pattern | Description |
|---------|-------------|
| `criterion::black_box()` | Prevents compiler optimization of result |
| `criterion::benchmark()` | Measures specific operation timing |
| `criterion::plot()` | Generates HTML report with visualizations |
| `criterion::measurement::MeasurementContext` | Custom measurement setup |

**Example benchmark:**
```rust
use criterion::{black_box, criterion_main, Criterion, AxisScale};

fn hot_path(black_box(data: &[u8])) -> usize {
    // Function to benchmark
    data.iter().sum()
}

fn criterion_benchmark(c: &mut Criterion) {
    let data = vec![0u8; 1024];
    c.bench_function("hot_path", |b| b.iter(|| hot_path(black_box(&data))));
}

criterion_main!(criterion_benchmark);
```

### Step 2: Minimize Heap Allocations
Identify and eliminate unnecessary heap allocations in hot paths.

**Allocation detection:**

```bash
# Run with allocation tracking
RUSTFLAGS="-Z allocs" cargo bench -- bench_hot_path

# Or use valgrind/heaptrack for heap analysis
valgrind --tool=massif cargo run -- <binary>

# Check for expected allocation patterns
grep -rn "alloc::" --include="*.rs" | grep -v test | head -30
```

**Zero-allocation strategies:**

| Source of Allocations | Fix Strategy |
|----------------------|-------------|
| `String::new()` / `String::from()` | Use `&str` slices where possible |
| `Vec::new()` / `Vec::push()` | Pre-allocate with `Vec::with_capacity()` |
| Box/heap allocations | Use stack arrays `[[u8; N]; M]` |
| HashMap/HashSet creation | Use `indexmap` or `FnvHashMap` for small cases |
| Regex compilation | Cache compiled Regex with `lazy_static` or `once_cell` |
| Box::new() in loops | Return owned values or use stack allocation |

**Allocation reduction patterns:**

```rust
// Before (heap allocation per call)
fn process(data: &[u8]) -> String {
    let mut result = String::new();
    for &byte in data {
        result.push(byte);
    }
    result
}

// After (zero-allocation with &str)
fn process(data: &[u8]) -> &str {
    // Use existing data or convert once
    // Or return a static/owned string with careful lifetime
    unsafe { std::str::from_utf8_unchecked(data) }
}

// Or with pre-allocated buffer
fn process_with_buffer(data: &[u8], buf: &mut Vec<u8>) -> &str {
    buf.clear();
    buf.extend_from_slice(data);
    // Return string from buffer with careful lifetime
    std::str::from_utf8(buf).unwrap()
}
```

### Step 3: Profile with perf and Generate Flamegraphs
Deep profiling to identify CPU hotspots and cache misses.

```bash
# Record profiling data
perf record -g -o perf.data -- cargo run -- <args>

# Generate flamegraph
perf script | stackcollapse-perf.pl | flamegraph.pl > flamegraph.svg

# Or with cargo-embed
# perf record -g -o perf.data -- cargo test --bench

# Focus on specific hot function
perf record -g -o perf.data -F 99 -p <pid>
perf report

# Collect cycle counts and cache misses
perf stat -e cycles,instructions,cache-references,cache-misses -r 5 cargo run -- <args>
```

**perf event cheat sheet:**

| Event | Meaning |
|-------|---------|
| `cycles` | CPU cycles (overall duration) |
| `instructions` | Instruction count (IPC = instructions/cycle) |
| `cache-references` | L1/L2/L3 cache accesses |
| `cache-misses` | Cache misses (lower is better) |
| `branch-misses` | Mispredicted branches |
| `context-switches` | OS context switches |
| `cpu-migrations` | Thread migrations between CPUs |

### Step 4: Inspect Assembly for Optimization
Examine compiler output to verify optimizations and identify missed opportunities.

```bash
# Generate assembly for a specific function
rustc --emit asm -C opt-level=3 -C target-cpu=native -S src/hotpath.rs -o hotpath.asm

# Or via cargo
cargo asm --bin myapp -- lib=hotpath

# Analyze common patterns:
# - Loop unrolling
# - Vectorization (SSE/AVX)
# - Function inlining
# - Constant propagation
# - Dead code elimination

# Check optimization reports
rustc --emit llvm-ir -C opt-level=3 -S src/hotpath.rs -o hotpath.ll

# Use cargo's built-in asm exploration
cargo expand --bin myapp 2>/dev/null | head -200
```

**Assembly optimization checklist:**

| Optimization | Look For |
|-------------|----------|
| Loop unrolling | Multiple instructions per iteration |
| Vectorization | SIMD instructions (pcmpeqb, pand, etc.) |
| Inlining | No `call` instructions for small functions |
| Constant folding | Immediate values instead of loads |
| Strength reduction | Multiplication → addition in loops |
| Branch optimization | Likely paths predicted, unlikely paths minimized |

### Step 5: Generate Performance Report
Compile all findings into a comprehensive performance report.

```bash
mkdir -p perf-report

# Gather all metrics
cat > perf-report/zero-allocation-perf-report.md << 'REPORT'
# Zero-Allocation & Performance Profiling Report

**Project:** `$(basename $PWD)`
**Date:** `date -Iseconds`
**Rust Version:** `rustc --version`

## Benchmark Results (criterion)

### Hot Path Benchmarks
| Benchmark | Iterations | Mean [ns] | [placeholders for actual data] |
|-----------|-----------|-----------|--------------------------------|
| hot_path | <iter> | <ns> | |

### Allocation Analysis
| Function | Allocations Before | Allocations After | Reduction |
|----------|-------------------|-------------------|-----------|
| <func> | <count> | <count> | <pct>% |

## perf Profiling Results

### CPU Hotspots
| Function | CPU % | Instructions | Cycles | IPC |
|----------|-------|-------------|--------|-----|
| <func> | <pct> | <count> | <count> | <value> |

### Cache Behavior
| Function | Cache Misses | Miss Rate | Cycles Lost |
|----------|-------------|-----------|-------------|
| <func> | <count> | <pct> | <ns> |

## Assembly Analysis

### Optimizations Verified
| Optimization | Status |
|-------------|--------|
| Loop unrolling | ✅/❌ |
| Vectorization | ✅/❌ |
| Inlining | ✅/❌ |
| Constant folding | ✅/❌ |

### Missed Optimization Opportunities
| Function | Issue | Suggested Fix |
|----------|-------|---------------|
| <func> | <description> | <fix> |

## Action Required
<fill-in based on results>

## Typical Fixes

### Reducing heap allocations
```rust
// Before (per-call allocation)
fn format_data(data: &[u8]) -> String {
    format!("{:?}", data)
}

// After (zero-allocation, caller provides buffer)
fn format_data(data: &[u8], buf: &mut String) {
    buf.clear();
    write!(buf, "{:?}", data);
}

// Or with owned return but single allocation
fn format_data_once(data: &[u8]) -> String {
    // Only allocates once, caller controls lifetime
    data.iter().map(|&b| format!("{:02x}", b)).collect()
}
```

### Improving IPC (instructions per cycle)
```rust
// Before: division in loop (slow)
for i in 0..n {
    result = data[i] / divisor;
}

// After: multiplication by reciprocal (fast)
let reciprocal = 1.0 / divisor as f64;
for i in 0..n {
    result = (data[i] as f64 * reciprocal) as u64;
}
```

### Improving cache locality
```rust
// Before: scattered access
for i in 0..len {
    process(data[i], indices[i]);
}

// After: sequential access, structure-of-arrays
for i in 0..len {
    process(&data[i..i+chunk_size], &indices[i..i+chunk_size]);
}
```

## Integration with CI/CD

### GitHub Actions example
```yaml
name: Rust Performance Validation

on:
  pull_request:
    branches: [ main ]

jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Rust
        uses: actions-rust-lang/setup-rust-toolchain@v1
        with:
          toolchain: 1.98.1
      
      - name: Install criterion
        run: cargo install criterion
      
      - name: Run benchmarks
        run: |
          cargo bench --bench perf_bench
      
      - name: Check for allocation changes
        run: |
          # Fail if allocations increase
          RUSTFLAGS="-Z allocs" cargo bench -- bench_hot_path 2>&1 | \
            grep "avg allocs" || true
      
      - name: Profile with perf
        run: |
          perf record -g -o perf.data -- cargo test
          perf script | stackcollapse-perf.pl | flamegraph.pl > flamegraph.svg
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `No benchmarks found` | Criterion not configured | Add `criterion` dev dependency, create `benches/` directory |
| `perf: permission denied` | Insufficient privileges | Run with `sudo` or adjust `/proc/sys/kernel/perf_event_paranoid` |
| `flamegraph too large` | Too many functions profiled | Filter to hot functions: `perf record -g -o perf.data -k <function>` |
| `Assembly doesn't optimize` | Sub-optimal compile flags | Add `-C opt-level=3 -C target-cpu=native` to Rust flags |
| `IPC unexpectedly low` | High overhead from function calls | Inline small functions, reduce indirection |
| `Allocation decrease not visible` | Optimizer removing dead code | Use `criterion::black_box()` to prevent optimization |