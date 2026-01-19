$migrationsDir = "supabase/migrations"
$files = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

$grouped = $files | Group-Object { $_.Name.Substring(0, 8) }

foreach ($group in $grouped) {
    if ($group.Name -match "^\d{8}$") {
        $counter = 100000 # Start at 100000 (10:00:00) to ensure fixed 6 chars and avoid leading zero issues in formatting if simple
        foreach ($file in $group.Group) {
            # Extract suffix (everything after the first underscore)
            $parts = $file.Name -split '_', 2
            if ($parts.Length -eq 2) {
                $suffix = $parts[1]
                # New timestamp: YYYYMMDD + Counter (starting at 100000)
                $newTimestamp = $group.Name + $counter
                $newName = "${newTimestamp}_${suffix}"
                
                $oldPath = $file.FullName
                $newPath = Join-Path $migrationsDir $newName
                
                Write-Host "Renaming $($file.Name) to $newName"
                git mv $oldPath $newPath
                
                $counter++
            }
        }
    }
}
