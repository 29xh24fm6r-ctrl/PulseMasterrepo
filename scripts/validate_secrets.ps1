$serviceAccount = "firebase-app-hosting-compute@pulse-life-os-2a8c9.iam.gserviceaccount.com"
$project = "pulse-life-os-2a8c9"
$yamlFile = "apphosting.yaml"

# Extract secret names
$content = Get-Content $yamlFile
$secrets = $content | Select-String "secret: (.*)" | ForEach-Object { $_.Matches.Groups[1].Value.Trim() }

$missing = @()

foreach ($secret in $secrets) {
    if ([string]::IsNullOrWhiteSpace($secret)) { continue }
    
    # Check IAM policy
    $policy = gcloud secrets get-iam-policy $secret --project=$project --format="json" | ConvertFrom-Json
    
    $hasAccess = $false
    if ($policy.bindings) {
        foreach ($binding in $policy.bindings) {
            if ($binding.role -eq "roles/secretmanager.secretAccessor") {
                if ($binding.members -contains "serviceAccount:$serviceAccount") {
                    $hasAccess = $true
                    break
                }
            }
        }
    }
    
    if (-not $hasAccess) {
        Write-Host "MISSING: $secret"
        $missing += $secret
    }
    else {
        # Write-Host "OK: $secret"
    }
}

Write-Host "Total Missing:`t$($missing.Count)"
$missing | Out-File "missing_secrets.txt"
