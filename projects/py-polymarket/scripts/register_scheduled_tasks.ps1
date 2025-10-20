param(
    [int]$AnalyticsEveryMinutes = 60,
    [int]$AbEveryMinutes = 120,
    [string]$LogDir = "logs"
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoPath {
    param([string]$Relative)
    $root = (Resolve-Path ".").Path
    return (Resolve-Path (Join-Path $root $Relative)).Path
}

function Ensure-Dir($Path){ if(-not (Test-Path $Path)){ New-Item -ItemType Directory -Path $Path | Out-Null } }

function Register-Task {
    param(
        [string]$Name,
        [string]$ScriptPath,
        [int]$EveryMinutes,
        [string]$Args = ""
    )
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) -RepetitionDuration ([TimeSpan]::MaxValue)
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" $Args"
    try {
        Register-ScheduledTask -TaskName $Name -Trigger $trigger -Action $action -RunLevel Highest -Force | Out-Null
        Write-Host "Registered scheduled task: $Name (every $EveryMinutes min)" -ForegroundColor Green
    } catch {
        Write-Warning "Failed to register $Name: $_"
    }
}

try {
    $repo = (Resolve-Path ".").Path
    Ensure-Dir $LogDir
    $analytics = Resolve-RepoPath "scripts/run_daily_analytics.ps1"
    $ab = Resolve-RepoPath "scripts/run_online_ab.py"
    if(-not (Test-Path $analytics)){ throw "Missing $analytics" }
    if(-not (Test-Path $ab)){ throw "Missing $ab" }
    Register-Task -Name "Poly_Analytics_Daily" -ScriptPath $analytics -EveryMinutes $AnalyticsEveryMinutes -Args "-WindowHours 24"
    $py = (Get-ChildItem -Recurse -Filter python.exe .venv | Select-Object -ExpandProperty FullName -First 1)
    if(-not $py){ $py = "python" }
    $abWrapper = Join-Path $env:TEMP "poly_run_ab.ps1"
    @"
`$env:SERVICE_USE_WS = 'false'
& '$py' '$ab' --markets 30 --limit 50 --holding-seconds 300 | Out-File -FilePath (Join-Path '$LogDir' 'ab_last.txt') -Encoding UTF8
"@ | Set-Content -Path $abWrapper -Encoding UTF8
    Register-Task -Name "Poly_AB_Online" -ScriptPath $abWrapper -EveryMinutes $AbEveryMinutes
} catch {
    Write-Error $_
    exit 1
}

