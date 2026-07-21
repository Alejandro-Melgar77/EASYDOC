[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & docker compose --project-name easydoc-local -f docker-compose.local.yml down
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Compose could not stop EASYDOC Local.'
    }
    Write-Host 'EASYDOC Local stopped. Its Docker volumes were preserved.'
} finally {
    Pop-Location
}
