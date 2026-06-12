$ErrorActionPreference = 'Continue'
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path "$repo\.git")) { $repo = 'C:\apartmentapp-cursor' }
$protect = @('main', 'cursor/financial-admin', 'fix/ledger-idor-gdpr', 'wind/web-refactor-ui')
git -C $repo fetch origin --prune | Out-Null
$merged = git -C $repo branch -r --merged origin/main
$deleted = 0
foreach ($line in $merged) {
  $b = $line.Trim()
  if ($b -notmatch '^origin/' -or $b -match 'HEAD') { continue }
  $name = $b -replace '^origin/', ''
  if ($protect -contains $name) { Write-Host "SKIP $name"; continue }
  Write-Host "DELETE $name"
  git -C $repo push origin --delete $name 2>&1 | Out-Host
  if ($LASTEXITCODE -eq 0) { $deleted++ }
}
git -C $repo fetch origin --prune | Out-Null
$count = (git -C $repo branch -r).Count
Write-Host "Deleted=$deleted Remaining=$count"
