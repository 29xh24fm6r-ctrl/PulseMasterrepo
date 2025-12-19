# Fix all relative supabase/admin imports to use @/lib/supabase/admin alias

Write-Host "Fixing relative supabase/admin imports..." -ForegroundColor Cyan

$files = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx -Exclude node_modules,.next,dist,scripts |
    Where-Object { 
        $content = Get-Content $_.FullName -ErrorAction SilentlyContinue -Raw
        $content -and ($content -match "from\s+['""]\.\.\/.*supabase/admin['""]")
    }

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Replace all relative imports with alias
    $content = $content -replace "from\s+['""]\.\.\/\.\.\/supabase/admin['""]", "from '@/lib/supabase/admin'"
    $content = $content -replace "from\s+['""]\.\.\/\.\.\/\.\.\/supabase/admin['""]", "from '@/lib/supabase/admin'"
    $content = $content -replace "from\s+['""]\.\.\/\.\.\/\.\.\/\.\.\/supabase/admin['""]", "from '@/lib/supabase/admin'"
    $content = $content -replace "from\s+['""]\.\.\/supabase/admin['""]", "from '@/lib/supabase/admin'"
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $count++
        Write-Host "  Fixed: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ Fixed $count file(s)" -ForegroundColor Green

