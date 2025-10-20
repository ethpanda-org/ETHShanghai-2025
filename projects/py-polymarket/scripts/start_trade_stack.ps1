[CmdletBinding()]
param(
    [int]$Port = 8888,
    [int]$Interval = 60,
    [switch]$Live
)

$launcher = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "launch_online_stack.ps1"

$arguments = @{
    Port     = $Port
    Interval = $Interval
    Detach   = $true
}

if ($Live) {
    $arguments["Live"] = $true
}

& $launcher @arguments
