# Environment Variables Check Script
# Checks which variables are set locally

Write-Host "Environment Variables Check" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host ""

# Load .env.local if it exists
$envLocal = ".env.local"
if (Test-Path $envLocal) {
    Write-Host "Loading .env.local..." -ForegroundColor Yellow
    Get-Content $envLocal | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
    Write-Host ""
}

$requiredVars = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY"
)

Write-Host "Required Variables:" -ForegroundColor Yellow
Write-Host ""

$allRequiredPresent = $true
foreach ($varName in $requiredVars) {
    $value = [System.Environment]::GetEnvironmentVariable($varName, "Process")
    if ($value) {
        $masked = if ($varName -like "*KEY*" -or $varName -like "*SECRET*") {
            if ($value.Length -gt 12) {
                $value.Substring(0, 8) + "..." + $value.Substring($value.Length - 4)
            } else {
                "***hidden***"
            }
        } else {
            $value
        }
        Write-Host "  [OK] $varName" -ForegroundColor Green
        Write-Host "       $masked" -ForegroundColor Gray
    } else {
        Write-Host "  [MISSING] $varName" -ForegroundColor Red
        $allRequiredPresent = $false
    }
}

Write-Host ""
$openaiKey = [System.Environment]::GetEnvironmentVariable("OPENAI_API_KEY", "Process")
if ($openaiKey) {
    Write-Host "  [OK] OPENAI_API_KEY (optional)" -ForegroundColor Green
} else {
    Write-Host "  [OPTIONAL] OPENAI_API_KEY - not set" -ForegroundColor Yellow
}

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host ""
Write-Host "Vercel Environment Variables Check:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Select your project" -ForegroundColor White
Write-Host "3. Go to: Settings -> Environment Variables" -ForegroundColor White
Write-Host "4. Verify these are set for PRODUCTION:" -ForegroundColor White
Write-Host ""
foreach ($varName in $requiredVars) {
    Write-Host "   - $varName" -ForegroundColor Gray
}
Write-Host "   - OPENAI_API_KEY (optional)" -ForegroundColor Gray
Write-Host ""
Write-Host "Important:" -ForegroundColor Yellow
Write-Host "   - Variables must be set for PRODUCTION environment" -ForegroundColor White
Write-Host "   - Redeploy after adding new variables" -ForegroundColor White
Write-Host ""

if ($allRequiredPresent) {
    Write-Host "All required variables found locally!" -ForegroundColor Green
    Write-Host "Still verify they are set in Vercel for production." -ForegroundColor Yellow
} else {
    Write-Host "Some required variables missing locally." -ForegroundColor Red
    Write-Host "Add them to .env.local or Vercel environment variables." -ForegroundColor Yellow
}

Write-Host ""
