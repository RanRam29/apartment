param(
  [Parameter(Mandatory = $true)]
  [string]$FeatureId,

  [Parameter(Mandatory = $true)]
  [ValidateSet("planned", "in_progress", "merged", "approved")]
  [string]$Status,

  [string]$Owner = "TBD",
  [string]$PR = "-",
  [string]$MergedDate = "",
  [string]$ApprovedDate = "",
  [string]$Notes = ""
)

$tracker = Join-Path $PSScriptRoot "..\FEATURE_ROADMAP_TODO.md"
if (!(Test-Path $tracker)) {
  throw "Tracker file not found: $tracker"
}

$today = Get-Date -Format "yyyy-MM-dd"
if ($Status -eq "merged" -and [string]::IsNullOrWhiteSpace($MergedDate)) { $MergedDate = $today }
if ($Status -eq "approved" -and [string]::IsNullOrWhiteSpace($ApprovedDate)) { $ApprovedDate = $today }

$content = Get-Content -Raw -Path $tracker
$pattern = "(?m)^\| $([regex]::Escape($FeatureId)) \|.*$"
$row = [regex]::Match($content, $pattern).Value
if ([string]::IsNullOrWhiteSpace($row)) {
  throw "Feature ID '$FeatureId' was not found in tracker."
}

$parts = $row -split "\|"
if ($parts.Count -lt 11) {
  throw "Row format is invalid for feature '$FeatureId'."
}

# Columns: 0 empty, 1 ID, 2 Phase, 3 Feature, 4 Owner, 5 PR, 6 Status, 7 Merged Date, 8 Approved Date, 9 Notes, 10 empty
$phase = $parts[2].Trim()
$feature = $parts[3].Trim()
$currentOwner = $parts[4].Trim()
$currentPR = $parts[5].Trim()
$currentNotes = $parts[9].Trim()

$newOwner = if ([string]::IsNullOrWhiteSpace($Owner)) { $currentOwner } else { $Owner }
$newPR = if ([string]::IsNullOrWhiteSpace($PR)) { $currentPR } else { $PR }
$newMergedDate = if ([string]::IsNullOrWhiteSpace($MergedDate)) { "-" } else { $MergedDate }
$newApprovedDate = if ([string]::IsNullOrWhiteSpace($ApprovedDate)) { "-" } else { $ApprovedDate }
$newNotes = if ([string]::IsNullOrWhiteSpace($Notes)) { $currentNotes } else { $Notes }

$newRow = "| $FeatureId | $phase | $feature | $newOwner | $newPR | $Status | $newMergedDate | $newApprovedDate | $newNotes |"
$updated = [regex]::Replace($content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $newRow }, 1)

$updated = $updated -replace "(?m)^Last updated: .*$", "Last updated: $today"
Set-Content -Path $tracker -Value $updated -NoNewline

Write-Host "Updated $FeatureId -> $Status in FEATURE_ROADMAP_TODO.md"
