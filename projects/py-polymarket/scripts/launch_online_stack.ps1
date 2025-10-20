# Unified launcher for trader + monitor stacks (paper/live, attached/detached).
# Example: .\scripts\launch_online_stack.ps1 -Port 8888 -Interval 60 -Markets 5 -Limit 40 -Detach

[CmdletBinding()]
param(
    [int]$Port = 8888,
    [int]$Interval = 60,
    [int]$Markets = 0,
    [int]$Limit = 0,
    [int]$WsMinScore = 0,
    [ValidateSet("INFO", "DEBUG", "WARNING", "ERROR", "CRITICAL")]
    [string]$LogLevel = "INFO",
    [switch]$Live,
    [switch]$Detach,
    [switch]$UseWs,
    [switch]$NoWs,
    [switch]$OpenBrowser,
    [switch]$NoProxy,
    [string]$ProxyUrl = "",
    [string]$NoProxyDomains = "",
    [string]$RequestsCaBundle = "",
    [switch]$UseGraphql,
    [switch]$OrderWs,
    [int]$OrderWsLimit = 50,
    [string]$StaticAssets = "",
    [string]$FallbackSkip = "",
    [string]$FallbackScale = ""
)

function Resolve-PythonPath {
    param([string[]]$Candidates)
    foreach ($candidate in $Candidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) {
            continue
        }
        if (Test-Path $candidate) {
            $resolved = Resolve-Path -LiteralPath $candidate -ErrorAction SilentlyContinue
            if ($resolved) {
                return $resolved.Path
            }
        }
        try {
            $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
            if ($cmd -and $cmd.Source) {
                return $cmd.Source
            }
        } catch {
            continue
        }
    }
    return $null
}

function Save-EnvValues {
    param([string[]]$Keys)
    $snapshot = @{}
    foreach ($key in $Keys) {
        $snapshot[$key] = Get-Item -Path ("Env:{0}" -f $key) -ErrorAction SilentlyContinue
    }
    return $snapshot
}

function Restore-EnvValues {
    param($Snapshot)
    foreach ($entry in $Snapshot.GetEnumerator()) {
        $item = $entry.Value
        $path = "Env:{0}" -f $entry.Key
        if ($null -eq $item) {
            Remove-Item -Path $path -ErrorAction SilentlyContinue
        } else {
            Set-Item -Path $path -Value $item.Value -ErrorAction SilentlyContinue
        }
    }
}

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $scriptRoot "..")).Path

$pythonCandidates = @(
    (Join-Path $repoRoot ".venv\Scripts\python.exe"),
    (Join-Path $repoRoot ".venv\.venv\Scripts\python.exe"),
    (Join-Path $repoRoot ".venv_tests\Scripts\python.exe"),
    $env:PYTHON,
    "python.exe",
    "python",
    "py.exe"
)
$pythonPath = Resolve-PythonPath -Candidates $pythonCandidates
if (-not $pythonPath) {
    throw "Python interpreter not found. Activate your virtual environment or set the PYTHON environment variable."
}

$trackedEnv = @(
    "SERVICE_MARKET_FETCH_LIMIT",
    "SERVICE_WS_ASSET_LIMIT",
    "SERVICE_WS_MIN_SCORE",
    "SERVICE_WS_STATIC_ASSETS",
    "SERVICE_MARKET_CACHE_TTL",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
    "PROXY_URL",
    "REQUESTS_CA_BUNDLE",
    "PROXY_ENABLED",
    "POLY_PRIVATE_KEY",
    "POLY_DRY_RUN",
    "SERVICE_USE_WS",
    "SERVICE_USE_GRAPHQL",
    "SERVICE_USE_ORDER_WS",
    "ORDER_WS_SUB_LIMIT",
    "STRATEGY_SKIP_ON_FALLBACK",
    "STRATEGY_SIZE_SCALES_ON_FALLBACK",
    "STRATEGY_HALT_ON_FALLBACK"
)
$envSnapshot = Save-EnvValues -Keys $trackedEnv

try {
    if ($Limit -gt 0) {
        $env:SERVICE_MARKET_FETCH_LIMIT = [string]$Limit
    }
    if ($Markets -gt 0) {
        $env:SERVICE_WS_ASSET_LIMIT = [string]$Markets
    }
    if ($WsMinScore -gt 0) {
        $env:SERVICE_WS_MIN_SCORE = [string]$WsMinScore
    }
    if ($StaticAssets -and $StaticAssets.Trim().Length -gt 0) {
        $env:SERVICE_WS_STATIC_ASSETS = $StaticAssets
    }
    if ([string]::IsNullOrWhiteSpace($env:SERVICE_MARKET_CACHE_TTL)) {
        $env:SERVICE_MARKET_CACHE_TTL = "60"
    }
    if ($NoProxy.IsPresent) {
        $env:PROXY_ENABLED = "false"
    } elseif ([string]::IsNullOrWhiteSpace($env:PROXY_ENABLED)) {
        $env:PROXY_ENABLED = "true"
    }
    # Explicit proxy envs for this launch
    if ($ProxyUrl -and $ProxyUrl.Trim().Length -gt 0) {
        $env:HTTP_PROXY = $ProxyUrl
        $env:HTTPS_PROXY = $ProxyUrl
        $env:PROXY_URL = $ProxyUrl
    }
    if ($NoProxyDomains -and $NoProxyDomains.Trim().Length -gt 0) {
        $env:NO_PROXY = $NoProxyDomains
    }
    if ($RequestsCaBundle -and (Test-Path $RequestsCaBundle)) {
        $env:REQUESTS_CA_BUNDLE = (Resolve-Path -LiteralPath $RequestsCaBundle).Path
    }
    if (-not $Live) {
        $env:POLY_PRIVATE_KEY = ""
        $env:POLY_DRY_RUN = "true"
    } else {
        $env:POLY_DRY_RUN = "false"
    }
    if ($UseWs.IsPresent) {
        $env:SERVICE_USE_WS = "true"
    }
    if ($NoWs.IsPresent) {
        $env:SERVICE_USE_WS = "false"
    }
    if ($UseGraphql.IsPresent) {
        $env:SERVICE_USE_GRAPHQL = "true"
    }
    if ($OrderWs.IsPresent) {
        $env:SERVICE_USE_ORDER_WS = "true"
        if ($OrderWsLimit -gt 0) { $env:ORDER_WS_SUB_LIMIT = [string]$OrderWsLimit }
    }
    # Ingest fallback behaviour overrides
    if ($FallbackSkip -and $FallbackSkip.Trim().Length -gt 0) {
        $env:STRATEGY_SKIP_ON_FALLBACK = $FallbackSkip
    }
    if ($FallbackScale -and $FallbackScale.Trim().Length -gt 0) {
        $env:STRATEGY_SIZE_SCALES_ON_FALLBACK = $FallbackScale
    }

    $monitorArgs = @(
        "-m", "apps.launcher", "monitor",
        "--port", $Port.ToString(),
        "--log-level", $LogLevel,
        "--background"
    )
    if (-not $OpenBrowser.IsPresent) {
        $monitorArgs += "--no-browser"
    }

    Write-Host "Starting monitor on port $Port..." -ForegroundColor Cyan
    Start-Process -FilePath $pythonPath -ArgumentList $monitorArgs -WorkingDirectory $repoRoot -WindowStyle Minimized | Out-Null
    Start-Sleep -Seconds 2

    $tradeArgs = @(
        "-m", "apps.launcher", "trade",
        "--interval", $Interval.ToString(),
        "--log-level", $LogLevel
    )

    if ($Detach) {
        $psArgs = @(
            "-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command",
            "Set-Location '$repoRoot'; & '$pythonPath' -m apps.launcher trade --interval $Interval --log-level $LogLevel"
        )
        Start-Process powershell -ArgumentList $psArgs -WindowStyle Normal | Out-Null
        Write-Host "Trader launched in separate PowerShell window (interval=$Interval seconds)." -ForegroundColor Cyan
        Write-Host "Use scripts\stop_stack.ps1 to stop the spawned services when finished." -ForegroundColor Yellow
    } else {
        Write-Host "Starting trader loop (interval=$Interval seconds)..." -ForegroundColor Cyan
        & $pythonPath @tradeArgs
    }

    # Optionally start order lifecycle WS streamer in background
    if ($OrderWs.IsPresent) {
        $owsArgs = @("-m", "apps.launcher", "orders-ws", "--log-level", $LogLevel)
        if ($OrderWsLimit -gt 0) { $owsArgs += @("--limit", $OrderWsLimit.ToString()) }
        Start-Process -FilePath $pythonPath -ArgumentList $owsArgs -WorkingDirectory $repoRoot -WindowStyle Minimized | Out-Null
        Write-Host "Order lifecycle WS streamer launched (limit=$OrderWsLimit)." -ForegroundColor Cyan
    }
} finally {
    Restore-EnvValues -Snapshot $envSnapshot
}
