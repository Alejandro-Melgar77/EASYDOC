[CmdletBinding()]
param(
    [switch] $SkipSeed
)

$ErrorActionPreference = 'Stop'
$localRoot = $PSScriptRoot
$composeArgs = @('--project-name', 'easydoc-local', '-f', 'docker-compose.local.yml')

& (Join-Path $localRoot 'sync.ps1')

Push-Location $localRoot
try {
    & docker compose @composeArgs up -d --build mongodb redis minio minio-init onlyoffice backend celery-worker celery-beat frontend
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Compose could not start EASYDOC Local.'
    }

    $ready = $false
    for ($attempt = 1; $attempt -le 45; $attempt++) {
        try {
            $health = Invoke-RestMethod -Uri 'http://localhost:8100/api/health' -TimeoutSec 5
            if ($health.status -eq 'healthy') {
                $ready = $true
                break
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    }

    if (-not $ready) {
        throw 'The local API did not become healthy. Run .\stop.ps1 and review docker compose logs backend.'
    }

    if (-not $SkipSeed) {
        & docker compose @composeArgs run --rm seed
        if ($LASTEXITCODE -ne 0) {
            throw 'The local demo seed failed. Review the seed service output.'
        }
    }

    Write-Host ''
    Write-Host 'EASYDOC Local is ready.'
    Write-Host 'Web:     http://localhost:4300'
    Write-Host 'API:     http://localhost:8100/api/docs'
    Write-Host 'MinIO:   http://localhost:9101'
    Write-Host 'Office:  http://localhost:8180'
    Write-Host 'Admin:   directora@easydoc.edu / password123'
} finally {
    Pop-Location
}
