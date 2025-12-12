# ⚠️ DO NOT RUN PULSE OS FROM ONEDRIVE

## Why?

Running Next.js projects from OneDrive (or any cloud-synced folder) causes:
- File lock errors (`.next\dev\lock`)
- Build cache corruption
- Slow performance
- Git conflicts
- Lost work

## ✅ Correct Setup

**Always run Pulse OS from a local dev folder:**

```
C:\dev\pulse-os-dashboard
```

## Migration

If you're currently in OneDrive, see `MIGRATION_STEPS.md` for safe migration instructions.

## Future Prevention

- Never create repos under:
  - `OneDrive\Documents\`
  - `Dropbox\`
  - `iCloud Drive\`
  - Any cloud-synced folder

- Always use:
  - `C:\dev\` (Windows)
  - `~/dev/` or `~/projects/` (Mac/Linux)

## If You See Lock Errors

1. Kill Node processes: `taskkill /F /IM node.exe`
2. Delete `.next`: `Remove-Item -Recurse -Force .next`
3. Run `npm run dev` again
4. **Move the repo out of OneDrive** (see migration steps)



