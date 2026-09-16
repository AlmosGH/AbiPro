$examFolder = "erettsegik_2006_2026"   # change if needed

$sessions = Get-ChildItem $examFolder -Directory |
    Where-Object { $_.Name -match '^\d{4}_(osz|tavasz)$' } |
    Sort-Object Name

Write-Host "Found $($sessions.Count) exam sessions."

foreach ($session in $sessions) {
    $name = $session.Name
    $publishedMarker = Join-Path $session.FullName ".published"

    # Skip exams we've already successfully published
    if (Test-Path $publishedMarker) {
        Write-Host "SKIP: $name already published."
        continue
    }

    Write-Host ""
    Write-Host "========================================"
    Write-Host "Importing: $name"
    Write-Host "========================================"

    $steps = @(
        "prepare",
        "generate",
        "validate",
        "publish"
    )

    foreach ($step in $steps) {
        Write-Host ""
        Write-Host "[$name] Running $step..."

        npm run "exams:$step" -- $name

        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "ERROR: $step failed for $name"
            Write-Host "Stopping import."
            exit $LASTEXITCODE
        }
    }

    # Only mark as published if ALL four steps succeeded
    New-Item -ItemType File -Path $publishedMarker -Force | Out-Null

    Write-Host ""
    Write-Host "DONE: $name"
}

Write-Host ""
Write-Host "========================================"
Write-Host "All remaining exam sessions imported."
Write-Host "========================================"