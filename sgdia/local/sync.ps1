[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$localRoot = $PSScriptRoot
$projectRoot = Split-Path -Parent $localRoot
$sourceBackend = Join-Path $projectRoot 'backend'
$sourceFrontend = Join-Path $projectRoot 'frontend'
$targetBackend = Join-Path $localRoot 'backend'
$targetFrontend = Join-Path $localRoot 'frontend'

function Sync-Tree {
    param(
        [Parameter(Mandatory)] [string] $Source,
        [Parameter(Mandatory)] [string] $Destination,
        [Parameter(Mandatory)] [string[]] $ExcludedDirectories
    )

    if (-not (Test-Path -LiteralPath $Source)) {
        throw "Canonical source not found: $Source"
    }

    $resolvedDestination = [System.IO.Path]::GetFullPath($Destination)
    $resolvedRoot = [System.IO.Path]::GetFullPath($localRoot)
    if (-not $resolvedDestination.StartsWith("$resolvedRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to synchronize outside local/: $resolvedDestination"
    }

    New-Item -ItemType Directory -Force -Path $Destination | Out-Null
    & robocopy $Source $Destination /MIR /XD $ExcludedDirectories /XF .env *.log /R:2 /W:1 /NFL /NDL /NJH /NJS
    $robocopyExitCode = $LASTEXITCODE
    if ($robocopyExitCode -gt 7) {
        throw "robocopy failed for $Source with exit code $robocopyExitCode"
    }
}

Sync-Tree -Source $sourceBackend -Destination $targetBackend -ExcludedDirectories @(
    '.pytest_cache', '.ruff_cache', '__pycache__', '.mypy_cache', 'local_models'
)
Sync-Tree -Source $sourceFrontend -Destination $targetFrontend -ExcludedDirectories @(
    '.angular', '.cache', 'dist', 'node_modules'
)

New-Item -ItemType Directory -Force -Path (Join-Path $targetBackend 'local_models') | Out-Null
$state = [ordered]@{
    source_root = $projectRoot
    synced_at = (Get-Date).ToUniversalTime().ToString('o')
    backend_files = (Get-ChildItem -LiteralPath $targetBackend -Recurse -File | Measure-Object).Count
    frontend_files = (Get-ChildItem -LiteralPath $targetFrontend -Recurse -File | Measure-Object).Count
}
$state | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $localRoot '.sync-state.json') -Encoding utf8

Write-Host "Local EASYDOC source synchronized: $($state.backend_files) backend files, $($state.frontend_files) frontend files."
