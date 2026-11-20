# Cycle Examples

Each example adds one behaviour with the full cycle: red, green, refactor. The code is deliberately small; the sequence is the point.

## Rust: a new behaviour

Behaviour: "an empty input yields no records".

**Red**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_input_yields_no_records() {
        assert_eq!(parse_records(""), Vec::<Record>::new());
    }
}
```

```console
$ cargo test empty_input_yields_no_records
error[E0425]: cannot find function `parse_records` in this scope
```

That failure is a compile error, not the behaviour. Add a stub that compiles and returns the wrong thing, so the test fails on the assertion:

```rust
pub fn parse_records(_input: &str) -> Vec<Record> {
    vec![Record::default()]
}
```

```console
$ cargo test empty_input_yields_no_records
assertion `left == right` failed
  left: [Record { .. }]
 right: []
```

Now it fails for the right reason.

**Green**

```rust
pub fn parse_records(input: &str) -> Vec<Record> {
    input.lines().filter(|l| !l.trim().is_empty()).map(Record::from_line).collect()
}
```

Run the module's tests, not just this one: `cargo test parser::`.

**Refactor** only if something is unclear or duplicated, then run the tests again.

## Python: a bug fix

Bug: "a total with a trailing comma, like `1,2,`, crashes".

**Red: reproduce as a test**

```python
def test_trailing_comma_is_ignored():
    assert total("1,2,") == 3
```

```console
$ pytest tests/test_total.py::test_trailing_comma_is_ignored
ValueError: invalid literal for int() with base 10: ''
```

The failure is the reported crash, so the test captures the bug.

**Green: fix the cause**

```python
def total(text: str) -> int:
    return sum(int(part) for part in text.split(",") if part.strip())
```

```console
$ pytest tests/test_total.py
3 passed
```

The test stays as a regression test.

## TypeScript: change behind characterization tests

The goal is to refactor `formatPrice` (no tests) without changing output.

**Characterize first**

```ts
import { describe, expect, it } from "vitest";
import { formatPrice } from "./price";

describe("formatPrice (current behaviour)", () => {
  it.each([
    [0, "$0.00"],
    [1234.5, "$1,234.50"],
    [-3, "-$3.00"],
    [0.005, "$0.01"], // rounding: confirm this is intended
  ])("formats %s as %s", (input, expected) => {
    expect(formatPrice(input)).toBe(expected);
  });
});
```

These pass by construction. The rounding case is noted for the user, not silently preserved as "correct".

**Then refactor** with `npx vitest run src/price.test.ts` green after each step.

## Splitting a step that grew too big

If "green" for "supports CSV import" turns into a 300-line change, the behaviour was too big. Split it into behaviours such as:

1. a header row maps column names to fields
2. a quoted field may contain commas
3. an unknown column is reported, not ignored
4. an empty file imports nothing

Each one gets its own red, green, refactor.
