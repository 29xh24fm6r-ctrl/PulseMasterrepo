$serviceAccount = "service-651478110010@gcp-sa-firebaseapphosting.iam.gserviceaccount.com"
$project = "pulse-life-os-2a8c9"
$yamlFile = "apphosting.yaml"

# Extract secret names
$content = Get-Content $yamlFile
$secrets = $content | Select-String "secret: (.*)" | ForEach-Object { $_.Matches.Groups[1].Value.Trim() }

$results = @()

foreach ($secret in $secrets) {
    if ([string]::IsNullOrWhiteSpace($secret)) { continue }
    
    $status = "OK"
    $details = ""
    
    # 1. Check Existence
    $desc = gcloud secrets describe $secret --project=$project --format="json" 2>$null
    if (-not $desc) {
        $status = "MISSING_SECRET"
    }
    else {
        # 2. Check Version
        $versions = gcloud secrets versions list $secret --project=$project --limit=1 --filter="state:enabled" --format="json" 2>$null | ConvertFrom-Json
        if (-not $versions) {
            $status = "NO_ENABLED_VERSION"
        }
        else {
            # 3. Check Permission
            $policy = gcloud secrets get-iam-policy $secret --project=$project --format="json" 2>$null | ConvertFrom-Json
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
                $status = "MISSING_PERMISSION"
            }
        }
    }
    
    $obj = [PSCustomObject]@{
        Secret = $secret
        Status = $status
    }
    $results += $obj
    Write-Host "$secret : $status"
}

$results | Format-Table -AutoSize
$results | Where-Object { $_.Status -ne "OK" } | Select-Object -ExpandProperty Secret | Out-File "broken_secrets.txt"
