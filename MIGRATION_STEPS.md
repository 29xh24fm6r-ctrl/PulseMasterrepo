# Migration Steps: OneDrive → C:\dev\pulse-os-dashboard

## Current Status
- ✅ Remote configured: `origin` → `https://github.com/29xh24fm6r-ctrl/PulseMasterrepo.git`
- ✅ Branch: `dev` (up to date with origin)
- ⚠️ Uncommitted changes: Modified files + many untracked files

## Step 1: Commit Current Work

Run these commands in PowerShell **from the current OneDrive folder**:

```powershell
# Stage all changes (modified + untracked)
git add .

# Commit with descriptive message
git commit -m "chore: save WIP before migrating repo out of OneDrive

- Voice system quality pass fixes
- Persona flavor pack integration
- Various API route updates
- New components and features"

# Push to remote
git push origin dev
```

## Step 2: Create Dev Directory

Open a **new PowerShell window** (not in OneDrive) and run:

```powershell
# Create base dev folder if it doesn't exist
New-Item -ItemType Directory -Path "C:\dev" -ErrorAction SilentlyContinue | Out-Null

# Navigate into dev folder
Set-Location "C:\dev"
```

## Step 3: Clone Fresh Copy

Still in `C:\dev`, run:

```powershell
# Clone the repository
git clone https://github.com/29xh24fm6r-ctrl/PulseMasterrepo.git pulse-os-dashboard

# Navigate into the new repo
Set-Location "C:\dev\pulse-os-dashboard"

# Switch to dev branch (if not already on it)
git checkout dev
```

## Step 4: Verify Git Status

```powershell
# Check status
git status

# Verify remotes
git remote -v

# Check branches
git branch -a
```

You should see:
- Clean working tree (or minimal changes)
- `origin` remote pointing to GitHub
- `dev` and `main` branches available

## Step 5: Install Dependencies

```powershell
# Install npm packages
npm install
```

## Step 6: Test Dev Server

```powershell
# Start dev server
npm run dev
```

The app should start without OneDrive lock issues!

## Step 7: Update Cursor

1. **Close Cursor completely**
2. **Reopen Cursor**
3. **File → Open Folder** → Select `C:\dev\pulse-os-dashboard`
4. Verify everything loads correctly

## Step 8: Clean Up (After Verification)

Once you've confirmed:
- ✅ `npm run dev` works from `C:\dev\pulse-os-dashboard`
- ✅ Git history is intact
- ✅ All files are present
- ✅ Cursor opens the project correctly

You can **delete or archive** the old OneDrive folder:
- `C:\Users\mlpal\OneDrive\Documents\Pulse OS\pulse-os-dashboard-main`

**Important**: From now on, **always use**:
```
C:\dev\pulse-os-dashboard
```

## Troubleshooting

If you see `.next\dev\lock` errors:
1. Kill any stray `node` processes
2. Delete `.next` folder: `Remove-Item -Recurse -Force .next`
3. Run `npm run dev` again

## Next Steps

After migration, consider adding to `README.md`:
```markdown
## ⚠️ Important: Do Not Run from OneDrive

This repository should **never** be run from OneDrive, Dropbox, iCloud, or other cloud-synced folders.

**Recommended location**: `C:\dev\pulse-os-dashboard`

Cloud sync causes file lock issues with Next.js and can corrupt the `.next` build cache.
```



