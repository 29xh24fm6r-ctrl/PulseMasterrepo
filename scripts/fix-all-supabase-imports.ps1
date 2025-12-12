# PowerShell script to fix all supabase/admin imports
# This replaces all instances of imports from supabase/admin with @/lib/supabase

Write-Host "🔧 Fixing supabase/admin imports across codebase..." -ForegroundColor Cyan

# Get all TypeScript files
$files = Get-ChildItem -Path "lib" -Recurse -Filter "*.ts" | Where-Object {
    $content = Get-Content $_.FullName -Raw
    $content -match "supabase/admin" -or $content -match "supabaseAdminClient"
}

$fixedCount = 0
$totalFiles = $files.Count

Write-Host "Found $totalFiles files to process" -ForegroundColor Yellow

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    $fixed = $false

    # Replace import statements
    if ($content -match "import\s+\{\s*supabaseAdminClient\s*}\s+from\s+['""]\.\.\/.*supabase\/admin['""]") {
        $content = $content -replace "import\s+\{\s*supabaseAdminClient\s*}\s+from\s+['""]\.\.\/.*supabase\/admin['""]", "import { supabaseAdmin } from '@/lib/supabase'"
        $fixed = $true
    }
    
    # Replace all usages of supabaseAdminClient with supabaseAdmin
    if ($content -match "supabaseAdminClient") {
        $content = $content -replace "supabaseAdminClient", "supabaseAdmin"
        $fixed = $true
    }

    if ($fixed) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "✅ Fixed: $($file.FullName)" -ForegroundColor Green
        $fixedCount++
    }
}

Write-Host ""
Write-Host "✨ Fixed $fixedCount of $totalFiles files" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Please review changes and test before committing!" -ForegroundColor Yellow

