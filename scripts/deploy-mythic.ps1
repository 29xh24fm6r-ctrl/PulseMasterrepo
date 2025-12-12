# Mythic Story Sessions v1 - Deployment Script
# This script helps prepare for deployment

Write-Host "🚀 Mythic Story Sessions v1 - Deployment Preparation" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Check if migration file exists
$migrationFile = "supabase/migrations/008_mythic_arc_tables.sql"
if (Test-Path $migrationFile) {
    Write-Host "✅ Migration file found: $migrationFile" -ForegroundColor Green
} else {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Deployment Checklist:" -ForegroundColor Yellow
Write-Host ""
Write-Host "STEP 1: Apply Database Migration" -ForegroundColor Yellow
Write-Host "  Option A (Supabase Dashboard):" -ForegroundColor White
Write-Host "    1. Go to: https://supabase.com/dashboard" -ForegroundColor Gray
Write-Host "    2. Select your project" -ForegroundColor Gray
Write-Host "    3. Go to SQL Editor" -ForegroundColor Gray
Write-Host "    4. Copy/paste contents of: $migrationFile" -ForegroundColor Gray
Write-Host "    5. Click 'Run'" -ForegroundColor Gray
Write-Host ""
Write-Host "  Option B (Supabase CLI):" -ForegroundColor White
Write-Host "    supabase db push" -ForegroundColor Gray
Write-Host ""

Write-Host "STEP 2: Verify Environment Variables" -ForegroundColor Yellow
Write-Host "  Ensure these are set in your deployment platform:" -ForegroundColor White
Write-Host "    - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Gray
Write-Host "    - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host "    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" -ForegroundColor Gray
Write-Host "    - CLERK_SECRET_KEY" -ForegroundColor Gray
Write-Host "    - OPENAI_API_KEY (optional)" -ForegroundColor Gray
Write-Host ""

Write-Host "STEP 3: Deploy Code" -ForegroundColor Yellow
Write-Host "  Option A (Git Push - if auto-deploy enabled):" -ForegroundColor White
Write-Host "    git add ." -ForegroundColor Gray
Write-Host "    git commit -m 'feat: Mythic Story Sessions v1 - Production ready'" -ForegroundColor Gray
Write-Host "    git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "  Option B (Vercel CLI):" -ForegroundColor White
Write-Host "    vercel --prod" -ForegroundColor Gray
Write-Host ""

Write-Host "📄 Files to Review:" -ForegroundColor Yellow
Write-Host "  - DEPLOYMENT_GUIDE_MYTHIC.md - Full deployment guide" -ForegroundColor Gray
Write-Host "  - DEPLOYMENT_READINESS_CHECKLIST.md - Quick checklist" -ForegroundColor Gray
Write-Host "  - MYTHIC_VERIFICATION_REPORT.md - Verification details" -ForegroundColor Gray
Write-Host ""

Write-Host "Ready to deploy!" -ForegroundColor Green
Write-Host ""

