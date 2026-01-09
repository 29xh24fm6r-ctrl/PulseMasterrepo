$serviceAccount = "service-651478110010@gcp-sa-firebaseapphosting.iam.gserviceaccount.com"
$project = "pulse-life-os-2a8c9"
$role = "roles/secretmanager.secretAccessor"
$yamlFile = "apphosting.yaml"

# 1. Read secrets from yaml
$content = Get-Content $yamlFile
$secrets = $content | Select-String "secret: (.*)" | ForEach-Object { $_.Matches.Groups[1].Value.Trim() }

Write-Host "FOUND $($secrets.Count) SECRETS IN YAML"

foreach ($secret in $secrets) {
    if ([string]::IsNullOrWhiteSpace($secret)) { continue }
    
    # 2. Grant Access (Force)
    Write-Host "GRANTING: $secret -> $serviceAccount" 
    $proc = Start-Process -FilePath "gcloud" -ArgumentList "secrets add-iam-policy-binding $secret --member='serviceAccount:$serviceAccount' --role='$role' --project=$project --quiet" -PassThru -NoNewWindow -Wait
    
    if ($proc.ExitCode -ne 0) {
        Write-Host "ERROR: Failed to grant access to $secret"
    }
    else {
        Write-Host "SUCCESS: $secret"
    }
}
Write-Host "DONE"
