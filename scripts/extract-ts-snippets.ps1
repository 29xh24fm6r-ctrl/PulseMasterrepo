$script = @'
param(
  [string]$ErrorsFile = "ts-errors.txt",
  [int]$Radius = 25,
  [string]$OutFile = "ts-snippets.md"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath $ErrorsFile)) {
  Write-Host "ERROR: Cannot find $ErrorsFile" -ForegroundColor Red
  exit 1
}

$raw = Get-Content -LiteralPath $ErrorsFile

$items = @()
foreach ($line in $raw) {
  if ($line -match '^(?<file>[^()]+)\((?<ln>\d+),(?<col>\d+)\):\s+error\s+(?<code>TS\d+):\s+(?<msg>.*)$') {
    $items += [pscustomobject]@{
      file = $matches["file"].Trim()
      ln   = [int]$matches["ln"]
      col  = [int]$matches["col"]
      code = $matches["code"]
      msg  = $matches["msg"]
      raw  = $line
    }
  }
}

if ($items.Count -eq 0) {
  Write-Host "ERROR: No TS error lines parsed from $ErrorsFile" -ForegroundColor Red
  Write-Host "First 10 lines of $ErrorsFile:" -ForegroundColor Yellow
  $raw | Select-Object -First 10 | ForEach-Object { Write-Host $_ }
  exit 1
}

$uniq = $items | Sort-Object file, ln, col -Unique

"# TS Snippets (radius=$Radius)`n" | Set-Content -LiteralPath $OutFile -Encoding UTF8

$root = (Get-Location).Path

foreach ($it in $uniq) {
  $fp = $it.file

  if (![System.IO.Path]::IsPathRooted($fp)) {
    $fp = Join-Path $root $fp
  }

  Add-Content -LiteralPath $OutFile -Encoding UTF8 "`n---"
  Add-Content -LiteralPath $OutFile -Encoding UTF8 ("## {0}({1},{2}) {3}: {4}" -f $it.file, $it.ln, $it.col, $it.code, $it.msg)
  Add-Content -LiteralPath $OutFile -Encoding UTF8 ""

  if (!(Test-Path -LiteralPath $fp)) {
    Add-Content -LiteralPath $OutFile -Encoding UTF8 "MISSING FILE on disk. From errors:"
    Add-Content -LiteralPath $OutFile -Encoding UTF8 $it.raw
    Add-Content -LiteralPath $OutFile -Encoding UTF8 ""
    continue
  }

  $lines = Get-Content -LiteralPath $fp
  $start = [Math]::Max(1, $it.ln - $Radius)
  $end   = [Math]::Min($lines.Length, $it.ln + $Radius)

  Add-Content -LiteralPath $OutFile -Encoding UTF8 "```ts"

  for ($i = $start; $i -le $end; $i++) {
    $prefix = if ($i -eq $it.ln) { ">>" } else { "  " }
    $num = $i.ToString().PadLeft(5)
    $text = $lines[$i-1]
    Add-Content -LiteralPath $OutFile -Encoding UTF8 ("{0}{1}: {2}" -f $prefix, $num, $text)
  }

  Add-Content -LiteralPath $OutFile -Encoding UTF8 "```"
}

Write-Host "Wrote $OutFile with $($uniq.Count) snippets." -ForegroundColor Green
'@

Set-Content -LiteralPath "scripts\extract-ts-snippets.ps1" -Value $script -Encoding UTF8
Write-Host "✅ Overwrote scripts\extract-ts-snippets.ps1" -ForegroundColor Green

