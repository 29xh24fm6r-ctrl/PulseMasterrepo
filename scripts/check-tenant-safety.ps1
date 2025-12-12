# Quick tenant safety verification script
# This checks for common security issues in API routes

Write-Host "🔒 Checking Tenant Safety..." -ForegroundColor Cyan
Write-Host ""

$issues = @()

# Check 1: Routes using ANON_KEY
Write-Host "1. Checking for ANON_KEY usage (CRITICAL)..."
$anonKeyFiles = Get-ChildItem -Path "app/api" -Recurse -Filter "*.ts" | Select-String -Pattern "NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_ANON_KEY" | Select-Object -ExpandProperty Path -Unique
if ($anonKeyFiles) {
    Write-Host "   ❌ CRITICAL: Found routes using ANON_KEY:" -ForegroundColor Red
    $anonKeyFiles | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
    $issues += "ANON_KEY usage found"
} else {
    Write-Host "   ✅ No ANON_KEY usage found" -ForegroundColor Green
}

# Check 2: Routes not using requireClerkUserId
Write-Host "`n2. Checking for routes without requireClerkUserId..."
$routes = Get-ChildItem -Path "app/api" -Recurse -Filter "route.ts" | Where-Object { $_.FullName -notlike "*notion*" -and $_.FullName -notlike "*_debug*" }
$missingAuth = @()
foreach ($route in $routes) {
    $content = Get-Content $route.FullName -Raw
    if ($content -match "export async function (GET|POST|PUT|DELETE|PATCH)") {
        # Route exists, check for auth
        if ($content -notmatch "requireClerkUserId|requireFeature|isPublicRoute") {
            # Check if it's a public route by checking middleware
            $routePath = $route.FullName -replace ".*app\\api\\", "/api/" -replace "\\route\.ts$", ""
            if ($routePath -notmatch "/(sign-in|sign-up|admin|comm/call|comm/sms|stripe/webhook|manifest)") {
                $missingAuth += $route.FullName
            }
        }
    }
}
if ($missingAuth) {
    Write-Host "   ⚠️  Routes that might need auth check:" -ForegroundColor Yellow
    $missingAuth | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
} else {
    Write-Host "   ✅ All routes appear to have auth checks" -ForegroundColor Green
}

# Check 3: Direct createClient usage (should use supabaseServer)
Write-Host "`n3. Checking for direct createClient usage..."
$createClientFiles = Get-ChildItem -Path "app/api" -Recurse -Filter "*.ts" | Select-String -Pattern "createClient\(.*process\.env" | Select-Object -ExpandProperty Path -Unique
if ($createClientFiles) {
    Write-Host "   ⚠️  Routes using createClient directly (should use supabaseServer()):" -ForegroundColor Yellow
    $createClientFiles | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
} else {
    Write-Host "   ✅ No direct createClient usage found" -ForegroundColor Green
}

# Check 4: Notion routes properly disabled
Write-Host "`n4. Checking Notion routes are disabled..."
$notionRoutes = Get-ChildItem -Path "app/api/notion" -Recurse -Filter "route.ts" -ErrorAction SilentlyContinue
if ($notionRoutes) {
    $notDisabled = @()
    foreach ($route in $notionRoutes) {
        $content = Get-Content $route.FullName -Raw
        if ($content -notmatch "requireFeature|404|disabled") {
            $notDisabled += $route.FullName
        }
    }
    if ($notDisabled) {
        Write-Host "   ❌ Notion routes not properly disabled:" -ForegroundColor Red
        $notDisabled | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
        $issues += "Notion routes not disabled"
    } else {
        Write-Host "   ✅ All Notion routes are disabled" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ No Notion routes found" -ForegroundColor Green
}

Write-Host ""
if ($issues) {
    Write-Host "🚨 Issues found! Review the items above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ Basic checks passed! Run npm run audit-tenant for full scan." -ForegroundColor Green
    exit 0
}

