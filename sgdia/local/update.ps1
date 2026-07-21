[CmdletBinding()]
param(
    [switch] $SkipSeed
)

$ErrorActionPreference = 'Stop'
$localRoot = $PSScriptRoot

if ($SkipSeed) {
    & (Join-Path $localRoot 'start.ps1') -SkipSeed
} else {
    & (Join-Path $localRoot 'start.ps1')
}

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
