<#
.SYNOPSIS
    One-shot redeploy: pull latest code, rebuild, restart the stack, wait for
    health, and smoke-test - the sequence documented in runbooks/deployment.md
    section 7. Run this from any shell on the demo host after merging changes.

.USAGE
    powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
#>

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Step($name, $script) {
    Write-Host ""
    Write-Host "==> $name" -ForegroundColor Cyan
    & $script
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $name (exit $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Step "git pull" { git pull }
Step "docker compose build" { docker compose build }
Step "docker compose up -d" { docker compose up -d }
Step "wait for every service to report healthy" { bash scripts/wait-for-healthy.sh 180 }

Step "smoke test" {
    $envLine = Get-Content .env | Where-Object { $_ -match '^ATELIER_INTERNAL_SERVICE_TOKEN=' }
    $token = ($envLine -split '=', 2)[1]
    $env:ATELIER_INTERNAL_SERVICE_TOKEN = $token
    bash scripts/smoke-test.sh
}

Write-Host ""
Write-Host "==> Cloudflare Tunnel status" -ForegroundColor Cyan
$tunnel = Get-Service -Name cloudflared -ErrorAction SilentlyContinue
if ($tunnel) {
    Write-Host "$($tunnel.Name): $($tunnel.Status)"
    if ($tunnel.Status -ne "Running") {
        Write-Host "Tunnel service is not running - the site will not be reachable externally." -ForegroundColor Yellow
        Write-Host "Start it with: Start-Service cloudflared" -ForegroundColor Yellow
    }
} else {
    Write-Host "No 'cloudflared' service found - the tunnel isn't installed as a service on this host yet." -ForegroundColor Yellow
    Write-Host "See the one-time setup steps to install it (cloudflared tunnel login / create / route dns / service install)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Deploy finished." -ForegroundColor Green
