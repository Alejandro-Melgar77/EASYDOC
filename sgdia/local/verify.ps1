[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$health = Invoke-RestMethod -Uri 'http://localhost:8100/api/health' -TimeoutSec 10
if ($health.status -ne 'healthy') {
    throw "Local API is not healthy: $($health.status)"
}

& curl.exe --fail --silent --show-error --output NUL 'http://localhost:4300'
if ($LASTEXITCODE -ne 0) {
    throw 'Local web did not return HTTP 200.'
}

Write-Host 'EASYDOC Local verification passed.'
Write-Host "MongoDB: $($health.checks.mongodb.status)"
Write-Host "Redis:   $($health.checks.redis.status)"
