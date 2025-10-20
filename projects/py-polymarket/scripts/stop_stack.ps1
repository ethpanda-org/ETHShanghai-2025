param(
    [int]$Port = 8888
)

$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Stopping Polymarket processes..." -ForegroundColor Yellow
$targets = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and (
    $_.CommandLine -match 'apps\.launcher' -or
    $_.CommandLine -match 'polymarket-launch' -or
    $_.CommandLine -match 'run_online_simulation\.py' -or
    $_.CommandLine -match 'polymarket-simulate' -or
    $_.CommandLine -match 'polymarket-backtest'
  )
}
if ($targets) {
  $targets | Select-Object ProcessId,Name,CommandLine | Format-Table -AutoSize
  $targets | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {} }
} else {
  Write-Host "No matching processes found." -ForegroundColor DarkGray
}

try {
  $conns = Get-NetTCPConnection -LocalPort $Port -State Listen
  foreach($c in $conns){
    try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
  }
} catch {}

Start-Sleep -Milliseconds 400
Write-Host "Done. You can safely close remaining PowerShell windows if any." -ForegroundColor Green

