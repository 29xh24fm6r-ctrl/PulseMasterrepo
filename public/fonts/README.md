# Fonts Directory

This directory contains local font files to eliminate external network dependencies.

## Inter Font

To add the Inter font:

1. Download Inter Variable from: https://github.com/rsms/inter/releases
2. Extract `Inter-Variable.woff2` from the release
3. Place it in this directory as `Inter-Variable.woff2`

Alternatively, you can download directly:
```bash
# Using curl (macOS/Linux)
curl -L -o Inter-Variable.woff2 https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Variable.woff2

# Or visit: https://rsms.me/inter/download/
```

The font will be automatically loaded by Next.js from `app/layout.tsx`.

## Why Local Fonts?

- ✅ Zero external network dependency
- ✅ Faster builds (no Google Fonts API calls)
- ✅ Works in CI/CD without internet
- ✅ More reliable and deterministic
- ✅ Better for enterprise/offline environments

