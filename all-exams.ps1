$examFolder = ".\erettsegik_2006_2026"

$sessions = Get-ChildItem $examFolder -Directory |
    Sort-Object Name

Write-Host "Found $($sessions.Count) exam sessions."

foreach ($session in $sessions) {
    $name = $session.Name

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

    Write-Host ""
    Write-Host "✓ Finished $name"
}

Write-Host ""
Write-Host "========================================"
Write-Host "All exam sessions imported successfully."
Write-Host "========================================"