# Dev Server Start Guide

## ✅ Current Status

- **Working Directory**: `C:\Users\mlpal\OneDrive\Documents\Pulse OS\pulse-os-dashboard-main`
- **Dev Script**: ✅ Exists (`npm run dev`)
- **Package Manager**: npm (confirmed by `package-lock.json`)

## 🚀 Quick Start Commands

### Step 1: Navigate to App Folder
```powershell
cd "C:\Users\mlpal\OneDrive\Documents\Pulse OS\pulse-os-dashboard-main"
```

### Step 2: Install Dependencies (if needed)
```powershell
npm install
```

### Step 3: Start Dev Server
```powershell
npm run dev
```

**Expected Output**:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in X.Xs
```

### Step 4: Test Autopilot Scan
Once the server is running, call:
```bash
POST http://localhost:3000/api/autopilot/scan
Body: {}
```

## 📋 Available Scripts

From `npm run` output:
- `dev` - Start development server
- `build` - Build for production
- `start` - Start production server
- `lint` - Run ESLint
- `typecheck` - TypeScript type checking
- `guard:*` - CI guard scripts

## 🔍 Verify Setup

### Check if server is running:
```powershell
# In browser or API client
GET http://localhost:3000
```

### Check autopilot scan endpoint:
```powershell
POST http://localhost:3000/api/autopilot/scan
```

### Check terminal logs for:
```
AUTOPILOT SCAN USER { clerkUserId: 'user_XXXX', supabaseUserId: 'uuid-XXXX' }
```

## 🐛 Troubleshooting

### Port 3000 Already in Use
If you see "Port 3000 is already in use", Next.js will automatically use 3001, 3002, etc.
Use the port shown in the terminal output.

### Missing Dependencies
If you get module errors:
```powershell
npm install
```

### "Missing script: dev"
This shouldn't happen - the script exists. If it does:
1. Check you're in `pulse-os-dashboard-main` folder
2. Verify `package.json` has `"dev": "next dev"`

## 📝 Next Steps After Server Starts

1. **Trigger scan**: `POST /api/autopilot/scan`
2. **Check logs**: Look for `AUTOPILOT SCAN USER` in terminal
3. **Copy Clerk user ID**: From the log output
4. **Update policies**: Set `owner_user_id` in `plugin_automations` table
5. **Execute job**: Wait for cron or manually execute
6. **Verify suggestions**: Check `life_arc_autopilot_suggestions` table

