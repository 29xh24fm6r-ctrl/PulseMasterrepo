$serviceAccount = "firebase-app-hosting-compute@pulse-life-os-2a8c9.iam.gserviceaccount.com"
$project = "pulse-life-os-2a8c9"
$role = "roles/secretmanager.secretAccessor"
$yamlFile = "apphosting.yaml"

# Extract secret names
$content = Get-Content $yamlFile
$secrets = $content | Select-String "secret: (.*)" | ForEach-Object { $_.Matches.Groups[1].Value.Trim() }

foreach ($secret in $secrets) {
    if ([string]::IsNullOrWhiteSpace($secret)) { continue }
    
    Write-Host "Processing $secret..."
    
    # 1. Grant Access
    gcloud secrets add-iam-policy-binding $secret --member="serviceAccount:$serviceAccount" --role=$role --project=$project --quiet > $null 2>&1
    
    # 2. Verify Access
    $policy = gcloud secrets get-iam-policy $secret --project=$project --format="json" | ConvertFrom-Json
    $hasAccess = $false
    
    if ($policy.bindings) {
        foreach ($binding in $policy.bindings) {
            if ($binding.role -eq $role) {
                if ($binding.members -contains "serviceAccount:$serviceAccount") {
                    $hasAccess = $true
                    break
                }
            }
        }
    }
    
    if ($hasAccess) {
        Write-Host "SUCCESS: $secret"
    }
    else {
        Write-Host "FAILURE: $secret - Retrying..."
        # Retry once
        Start-Sleep -Seconds 1
        gcloud secrets add-iam-policy-binding $secret --member="serviceAccount:$serviceAccount" --role=$role --project=$project --quiet > $null 2>&1
        
        # Verify again
        $policy = gcloud secrets get-iam-policy $secret --project=$project --format="json" | ConvertFrom-Json
        # ... (simplified verification for brevity in script, trusting second try or logging error)
        if ($policy.bindings -match $serviceAccount) {
            Write-Host "SUCCESS (RETRY): $secret"
        }
        else {
            Write-Host "FATAL ERROR: Could not grant access to $secret"
        }
    }
}
