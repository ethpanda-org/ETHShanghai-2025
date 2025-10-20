param(
    [int]$Markets = 10,
    [int]$Limit = 20,
    [int]$HoldingSeconds = 60,
    [string]$Output = ""
)

$ErrorActionPreference = 'Continue'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $projectRoot

if (-not (Test-Path (Join-Path $projectRoot 'reports'))) {
    New-Item -ItemType Directory -Path (Join-Path $projectRoot 'reports') | Out-Null
}

if (-not $Output -or $Output -eq '') {
    $ts = Get-Date -Format 'yyyyMMdd_HHmmss'
    $Output = Join-Path $projectRoot ("reports/backtest_pnl_live_{0}.json" -f $ts)
}

$ledger = Join-Path $projectRoot 'reports/backtests_ledger.csv'
$cmd = "Set-Location '$projectRoot'; polymarket-backtest --markets $Markets --limit $Limit --holding-seconds $HoldingSeconds --output '$Output' --csv-ledger '$ledger'"

Start-Process powershell -ArgumentList @('-NoExit','-NoProfile','-ExecutionPolicy','Bypass','-Command', $cmd) | Out-Null

Write-Host "Started live backtest (markets=$Markets, hold=${HoldingSeconds}s)." -ForegroundColor Green
Write-Host "Output: $Output" -ForegroundColor Yellow
Write-Host "Ledger: $ledger" -ForegroundColor Yellow
