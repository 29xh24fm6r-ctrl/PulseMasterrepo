$serviceAccount = "firebase-app-hosting-compute@pulse-life-os-2a8c9.iam.gserviceaccount.com"
$project = "pulse-life-os-2a8c9"
$role = "roles/secretmanager.secretAccessor"
$yamlFile = "apphosting.yaml"

# Extract secret names from apphosting.yaml
$content = Get-Content $yamlFile
$secrets = $content | Select-String "secret: (.*)" | ForEach-Object { $_.Matches.Groups[1].Value.Trim() }

foreach ($secret in $secrets) {
    if ([string]::IsNullOrWhiteSpace($secret)) { continue }
    
    Write-Host "Granting access for $secret..."
    # Suppress output to speed up and avoid buffer fill
    gcloud secrets add-iam-policy-binding $secret --member="serviceAccount:$serviceAccount" --role=$role --project=$project --quiet > $null 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to grant access for $secret"
    }
}
Write-Host "Access grant complete."
