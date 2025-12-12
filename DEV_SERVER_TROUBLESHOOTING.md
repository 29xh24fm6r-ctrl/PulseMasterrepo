# Dev Server Troubleshooting

## Issue: ERR_FAILED on localhost:3000/productivity

The route exists at `app/productivity/page.tsx`, but the server isn't responding.

## Quick Fix Steps

### 1. Check if Dev Server is Running

```powershell
# Check if anything is listening on port 3000
netstat -ano | findstr :3000

# If nothing shows up, the server isn't running
```

### 2. Kill Stray Node Processes

```powershell
# Kill all node processes
taskkill /F /IM node.exe

# Or kill specific processes by ID
taskkill /F /PID <process_id>
```

### 3. Clean Build Cache

```powershell
# Delete Next.js build cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Delete node_modules (optional, if issues persist)
# Remove-Item -Recurse -Force node_modules
# npm install
```

### 4. Restart Dev Server

```powershell
# Start fresh dev server
npm run dev
```

### 5. Check for Compilation Errors

If the server starts but shows errors:
- Check the terminal output for TypeScript/compilation errors
- Fix any missing imports or type errors
- The server should show "Ready" when compilation succeeds

### 6. Verify Route Accessibility

Once server is running:
- Open `http://localhost:3000` (home page)
- Then try `http://localhost:3000/productivity`
- Check browser console for any client-side errors

## Common Causes

1. **Server crashed** - Check terminal for error messages
2. **Port conflict** - Another app using port 3000
3. **Build cache corruption** - Delete `.next` folder
4. **Missing dependencies** - Run `npm install`
5. **TypeScript errors** - Fix compilation errors first

## Next Steps

After restarting, if errors persist:
1. Check terminal output for specific error messages
2. Verify all imports in `app/productivity/page.tsx` are valid
3. Check if other routes work (e.g., `/dashboard`, `/life`)
4. Review browser console for client-side errors



