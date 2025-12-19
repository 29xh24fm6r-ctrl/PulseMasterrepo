# Migrate supabaseAdminClient to supabaseAdmin (unified symbol)
# This script updates imports and usages in server-side files

Write-Host "Migrating supabaseAdminClient → supabaseAdmin..." -ForegroundColor Cyan

$files = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx -Exclude node_modules,.next,dist | 
    Where-Object { 
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -and ($content -match "supabaseAdminClient")
    }

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Replace import statements
    $content = $content -replace "import\s+\{\s*supabaseAdminClient\s*}\s+from\s+['`"]@/lib/supabase/admin['`"]", "import { supabaseAdmin } from '@/lib/supabase/admin'"
    $content = $content -replace "import\s+\{\s*supabaseAdminClient\s*}\s+from\s+['`"]\.\.\/.*supabase/admin['`"]", "import { supabaseAdmin } from '../../supabase/admin'"
    $content = $content -replace "import\s+\{\s*supabaseAdminClient\s*}\s+from\s+['`"]\.\.\/\.\.\/.*supabase/admin['`"]", "import { supabaseAdmin } from '../../../supabase/admin'"
    $content = $content -replace "import\s+\{\s*supabaseAdminClient\s*}\s+from\s+['`"]\.\.\/\.\.\/\.\.\/.*supabase/admin['`"]", "import { supabaseAdmin } from '../../../../supabase/admin'"
    $content = $content -replace "import\s+\{\s*supabaseAdminClient\s*}\s+from\s+['`"]@/lib/supabase['`"]", "import { supabaseAdmin } from '@/lib/supabase/admin'"
    
    # Replace all usages (but not in comments or strings if possible)
    # Simple replace for variable usage
    $content = $content -replace '\bsupabaseAdminClient\b', 'supabaseAdmin'
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $count++
        Write-Host "  Updated: $($file.FullName)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ Migration complete! Updated $count file(s)" -ForegroundColor Green
Write-Host ""
Write-Host "Note: The backward-compatible alias in lib/supabase/admin.ts ensures" -ForegroundColor Yellow
Write-Host "      existing code continues to work during the transition period." -ForegroundColor Yellow

