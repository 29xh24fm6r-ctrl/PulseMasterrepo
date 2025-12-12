# Fix strategic_mind imports
$files = Get-ChildItem -Path "lib/strategic_mind" -Recurse -Filter "*.ts"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $changed = $false
    
    # Replace import statements
    if ($content -match "from ['\`"]\.\.\/\.\.\/supabase\/admin['\`"]") {
        $content = $content -replace "from ['\`"]\.\.\/\.\.\/supabase\/admin['\`"]", "from '@/lib/supabase'"
        $changed = $true
    }
    if ($content -match "from ['\`"]\.\.\/\.\.\/\.\.\/supabase\/admin['\`"]") {
        $content = $content -replace "from ['\`"]\.\.\/\.\.\/\.\.\/supabase\/admin['\`"]", "from '@/lib/supabase'"
        $changed = $true
    }
    
    # Replace variable name
    if ($content -match "supabaseAdminClient") {
        $content = $content -replace "supabaseAdminClient", "supabaseAdmin"
        $changed = $true
    }
    
    if ($changed) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Fixed: $($file.FullName)"
    }
}

Write-Host "Done!"

