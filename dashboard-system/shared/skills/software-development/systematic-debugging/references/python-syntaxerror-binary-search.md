# Binary Search Compilation for Python SyntaxErrors

## The Problem

Python reports a SyntaxError at line N, but the **actual root cause** is often much earlier — an unclosed triple-quoted string, missing bracket, or unbalanced parenthesis hundreds of lines above. Fixing line N doesn't help; you need to find where the real damage began.

Example from a real debugging session:
```
SyntaxError: invalid character '—' (U+2014) (cli.py, line 12684)
```

The `—` was perfectly valid inside a string literal. The real problem? Orphaned docstring text 70 lines above (line 12611-12619) that was left behind when a docstring was shortened to a one-liner. The orphaned `"""` opened an unclosed triple-quoted string, and the em dash at line 12684 was just where Python finally gave up trying to parse through the unclosed string.

## The Fix: Binary Search Compilation

Compile increasingly large slices of the file to isolate where the error first appears. The first failing slice is close to the **root cause**, not the symptom.

```python
with open('cli.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def try_compile(up_to):
    snippet = ''.join(lines[:up_to])
    try:
        compile(snippet + '\npass\n', '<test>', 'exec')
        return True
    except SyntaxError as e:
        return False

# Binary search: find where the error first appears
for n in [5000, 8000, 10000, 12000, 12500, 12650, 12670, 12680]:
    ok = try_compile(n)
    print(f'First {n} lines: {"OK" if ok else "FAIL"}')
```

For precision, get the actual error message at each boundary:

```python
for n in [8000, 10000, 12650, 12680]:
    snippet = ''.join(lines[:n])
    try:
        compile(snippet + '\npass\n', '<test>', 'exec')
        print(f'First {n}: OK')
    except SyntaxError as e:
        print(f'First {n}: {e.msg} (line {e.lineno})')
```

### Expected output pattern

```
First 5000: OK
First 8000: FAIL at line 8002: expected an indented block after 'except'
First 10000: FAIL at line 10002: expected 'except' or 'finally' block
First 12000: OK
First 12500: OK
First 12650: FAIL at line 12619: unterminated triple-quoted string literal
First 12680: FAIL at line 12678: unterminated triple-quoted string literal
```

The "OK" at 12000/12500 rules out problems before those points. The first FAIL after an OK marks the boundary. The error message (`unterminated triple-quoted string literal` at line 12619) points to the real root cause — not the `invalid character` at line 12684.

### Narrowing down with fine-grained search

Once you've pinned it to within ~50 lines:

```python
for n in [12600, 12610, 12615, 12616, 12617, 12618, 12619, 12620]:
    snippet = ''.join(lines[:n])
    try:
        compile(snippet + '\npass\n', '<test>', 'exec')
        print(f'First {n}: OK')
    except SyntaxError as e:
        print(f'First {n}: {e.msg} (line {e.lineno})')
```

## Common Root Cause Patterns in Large Python Files

| Reported Error | Likely Root Cause |
|---|---|
| `invalid character '—' / '...' / '...'` | Unclosed string/triple-quote upstream; the "invalid" char is inside what Python thinks is code |
| `unterminated string literal` | Missing `"""` close in a multi-line docstring above |
| `unexpected EOF while parsing` | Missing `)`, `]`, or `}` somewhere |
| `invalid syntax` at a `)` or `]` | Unbalanced brackets above |
| `name 'X' is not defined` then `SyntaxError` | A stray string closing prematurely changed how subsequent code parses |

## Why This Works

Python's tokenizer processes the file sequentially. A SyntaxError at line N tells you where the tokenizer **gave up**, not where it **went wrong**. By compiling truncated slices, you find the exact line where the tokenizer first enters an invalid state — that's where you should look for the root cause.

## Checklist

- [ ] Did you read the SyntaxError line number AND the error type?
- [ ] Did you check if upstream code has unclosed strings, brackets, or parens?
- [ ] Did you use binary search compilation to isolate the first failing slice?
- [ ] Did you verify the fix by compiling the entire file cleanly?
