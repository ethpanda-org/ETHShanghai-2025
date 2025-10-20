param(
    [string]$Input = "",
    [switch]$WaitForFile,
    [int]$WaitSeconds = 0
)

$ErrorActionPreference = 'Continue'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $projectRoot
$reports = Join-Path $projectRoot 'reports'

if (-not $Input -or $Input -eq '') {
    $candidates = Get-ChildItem $reports -File -Filter 'backtest_pnl_live_*.json' | Sort-Object LastWriteTime -Descending
    if (-not $candidates) {
        $candidates = Get-ChildItem $reports -File -Filter 'backtest_pnl*.json' | Sort-Object LastWriteTime -Descending
    }
    if ($candidates) {
        $Input = $candidates[0].FullName
    }
}

if ($WaitForFile -and -not (Test-Path $Input)) {
    $deadline = (Get-Date).AddSeconds([Math]::Max(0,$WaitSeconds))
    while(-not (Test-Path $Input) -and (Get-Date) -lt $deadline) { Start-Sleep -Milliseconds 500 }
}

if (-not (Test-Path $Input)) {
    Write-Error "Input file not found: $Input"
    exit 1
}

$json = Get-Content $Input -Raw | ConvertFrom-Json
if ($json.PSObject.Properties.Name -contains 'trades') {
    $trades = @($json.trades)
} else {
    $trades = @($json)
}

# Build details
$detailRows = @()
foreach($t in $trades){
    $names = @()
    foreach($s in @($t.strategy_metadata.strategies)){
        if($s -and $s.PSObject.Properties['name']){ $names += $s.name }
    }
    $detailRows += [PSCustomObject]@{
        market_id = $t.market_id
        action    = $t.action
        size      = $t.size
        entry     = $t.entry_price
        exit      = $t.exit_price
        pnl       = $t.pnl
        pnl_pct   = $t.pnl_pct
        timestamp = $t.timestamp
        strategies= ($names -join ', ')
    }
}

# Strategy attribution
$by = @{}
foreach($t in $trades){
    $p = 0.0; if($t.pnl -ne $null){ $p = [double]$t.pnl }
    foreach($s in @($t.strategy_metadata.strategies)){
        $n = $s.name; if(-not $n){ continue }
        if(-not $by.ContainsKey($n)){ $by[$n] = [ordered]@{ trades=0; total_pnl=0.0 } }
        $by[$n].trades += 1
        $by[$n].total_pnl += $p
    }
}
$stratRows = @()
foreach($k in ($by.Keys | Sort-Object)){
    $v = $by[$k]
    $stratRows += [PSCustomObject]@{ strategy=$k; trades=$v.trades; total_pnl=[math]::Round($v.total_pnl,2) }
}

$total = $trades.Count
$wins = ($trades | Where-Object { $_.pnl -gt 0 }).Count
$sumPnl = ($trades | Measure-Object -Property pnl -Sum).Sum
$summary = [ordered]@{
    file           = $Input
    trades         = $total
    wins           = $wins
    win_rate       = [math]::Round(($wins/[math]::Max(1,$total)),3)
    total_pnl      = [math]::Round(($sumPnl),2)
    pnl_per_trade  = [math]::Round(($sumPnl/[math]::Max(1,$total)),2)
    strategies     = $stratRows
}

$base = [System.IO.Path]::GetFileNameWithoutExtension($Input)
$dir  = [System.IO.Path]::GetDirectoryName($Input)
$summaryPath = Join-Path $dir ("{0}_summary.json" -f $base)
$csvPath     = Join-Path $dir ("{0}_trades.csv" -f $base)

$detailRows | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $csvPath
$summary | ConvertTo-Json -Depth 6 | Set-Content -Path $summaryPath -Encoding utf8

Write-Host "Summary: $summaryPath" -ForegroundColor Green
Write-Host "Trades CSV: $csvPath" -ForegroundColor Green

