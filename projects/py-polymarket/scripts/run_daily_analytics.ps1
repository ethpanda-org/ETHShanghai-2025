param(
    [int]$WindowHours = 24,
    [int]$EveryMinutes = 0
)

$ErrorActionPreference = 'Stop'

function Get-PythonPath {
    $candidates = @(
        ".venv\\.venv\\Scripts\\python.exe",
        ".venv\\Scripts\\python.exe",
        ".venv_tests\\Scripts\\python.exe",
        "python.exe",
        "python",
        "py.exe"
    )
    foreach($c in $candidates){
        try {
            if (Test-Path $c) { return (Resolve-Path $c).Path }
            $cmd = Get-Command $c -ErrorAction SilentlyContinue
            if ($cmd -and $cmd.Source) { return $cmd.Source }
        } catch { }
    }
    throw "Python interpreter not found. Activate your virtual environment or install Python."
}

function Run-Once {
    param([string]$Py)
    $repo = (Resolve-Path ".").Path
    # Exit reasons (tp/sl and worst markets)
    $exitScript = (Resolve-Path "scripts/analyze_exit_reasons.py").Path
    & $Py $exitScript --window-hours $WindowHours | Write-Host
    # Event-driven activity (last window hours)
    $evScript = (Resolve-Path "scripts/analyze_event_driven.py").Path
    & $Py $evScript --hours $WindowHours | Write-Host
    # Daily summary for yesterday (UTC)
    $yday = (Get-Date).ToUniversalTime().AddDays(-1).ToString('yyyy-MM-dd')
    $dayScript = (Resolve-Path "scripts/analyze_yesterday.py").Path
    & $Py $dayScript --date $yday | Write-Host
}

try {
    $py = Get-PythonPath
    if ($EveryMinutes -gt 0) {
        Write-Host "Running analytics every $EveryMinutes minute(s) (window=$WindowHours h)..." -ForegroundColor Cyan
        while($true){
            Run-Once -Py $py
            Start-Sleep -Seconds ([Math]::Max(60, $EveryMinutes * 60))
        }
    } else {
        Write-Host "Running one-shot analytics (window=$WindowHours h)..." -ForegroundColor Cyan
        Run-Once -Py $py
        Write-Host "Wrote reports/exit_analytics.json" -ForegroundColor Green
    }
} catch {
    Write-Error $_
    exit 1
}
