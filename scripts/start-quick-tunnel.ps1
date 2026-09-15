[CmdletBinding()]
param(
  [int]$OriginPort = 3000,
  [int]$StartupTimeoutSeconds = 30,
  [int]$PublicVerifyTimeoutSeconds = 60,
  [switch]$SkipCommerceRestart
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$originUrl = "http://127.0.0.1:$OriginPort"
$envPath = Join-Path $projectRoot ".env"
$runtimeLogDirectory = Join-Path $projectRoot ".runtime-logs"
$stderrPath = Join-Path $runtimeLogDirectory "cloudflared.err.log"
$stdoutPath = Join-Path $runtimeLogDirectory "cloudflared.out.log"

function Resolve-Cloudflared {
  $workspaceBinary = Join-Path $projectRoot ".tools\cloudflared.exe"
  if (Test-Path -LiteralPath $workspaceBinary) {
    return $workspaceBinary
  }

  $command = Get-Command cloudflared.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $installedBinary = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
  if (Test-Path -LiteralPath $installedBinary) {
    return $installedBinary
  }

  throw "cloudflared.exe was not found. Install it or place it at .tools\cloudflared.exe."
}

function Assert-GatewayOrigin {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "$originUrl/api/health" -TimeoutSec 8
    if ($response.StatusCode -ne 200) {
      throw "Gateway returned HTTP $($response.StatusCode)."
    }
  } catch {
    throw "The Gateway is not reachable at $originUrl. Start the Gateway before starting the tunnel. $($_.Exception.Message)"
  }
}

function Stop-ExistingQuickTunnel {
  $portPattern = [regex]::Escape([string]$OriginPort)
  $processes = Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" |
    Where-Object { $_.CommandLine -match "--url\s+http://(127\.0\.0\.1|localhost):$portPattern\b" }

  foreach ($process in $processes) {
    Stop-Process -Id $process.ProcessId -Force
  }
}

function Read-TunnelUrl {
  if (-not (Test-Path -LiteralPath $stderrPath)) {
    return $null
  }

  $match = Select-String -LiteralPath $stderrPath -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -Last 1
  if ($match) {
    return $match.Matches[0].Value
  }

  return $null
}

function Update-GatewayUrl {
  if (-not (Test-Path -LiteralPath $envPath)) {
    throw "Missing $envPath. Copy .env.example to .env and configure the required local secrets first."
  }

  $lines = @(Get-Content -LiteralPath $envPath)
  $found = $false
  for ($index = 0; $index -lt $lines.Count; $index += 1) {
    if ($lines[$index] -match "^\s*WEB_GATEWAY_URL=") {
      $lines[$index] = "WEB_GATEWAY_URL=$script:tunnelUrl"
      $found = $true
    }
  }
  if (-not $found) {
    $lines += "WEB_GATEWAY_URL=$script:tunnelUrl"
  }

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($envPath, $lines, $utf8NoBom)
}

function Ensure-ComposeSigningSecret {
  $configured = Select-String -LiteralPath $envPath -Pattern "^ATELIER_PRINCIPAL_SIGNING_SECRET=.+" -Quiet
  if ($configured -or -not [string]::IsNullOrWhiteSpace($env:ATELIER_PRINCIPAL_SIGNING_SECRET)) {
    return
  }

  # Compose validates this required variable even when only commerce-service
  # is recreated. Reuse the already-running Account container's value in this
  # process instead of printing it, rotating it, or writing it to .env.
  $accountContainerId = & docker ps --filter "label=com.docker.compose.service=account-service" --format "{{.ID}}" | Select-Object -First 1
  if ($accountContainerId) {
    $secretEntry = & docker inspect --format "{{range .Config.Env}}{{println .}}{{end}}" $accountContainerId |
      Where-Object { $_ -like "ATELIER_PRINCIPAL_SIGNING_SECRET=*" } |
      Select-Object -First 1
    if ($secretEntry) {
      $env:ATELIER_PRINCIPAL_SIGNING_SECRET = $secretEntry.Substring($secretEntry.IndexOf("=") + 1)
      return
    }
  }

  throw "ATELIER_PRINCIPAL_SIGNING_SECRET is missing. Configure it in .env or start account-service before running the tunnel launcher."
}

Assert-GatewayOrigin
Stop-ExistingQuickTunnel

New-Item -ItemType Directory -Force -Path $runtimeLogDirectory | Out-Null
Set-Content -LiteralPath $stderrPath -Value "" -Encoding UTF8
Set-Content -LiteralPath $stdoutPath -Value "" -Encoding UTF8

$cloudflared = Resolve-Cloudflared
$startInfo = @{
  FilePath               = $cloudflared
  ArgumentList           = @("tunnel", "--protocol", "http2", "--url", $originUrl, "--no-autoupdate")
  WorkingDirectory       = $projectRoot
  WindowStyle            = "Hidden"
  RedirectStandardError  = $stderrPath
  RedirectStandardOutput = $stdoutPath
  PassThru                = $true
}
$tunnelProcess = Start-Process @startInfo

$script:tunnelUrl = $null
$deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
while ((Get-Date) -lt $deadline -and -not $script:tunnelUrl) {
  Start-Sleep -Milliseconds 500
  $script:tunnelUrl = Read-TunnelUrl
}

if (-not $script:tunnelUrl) {
  if (-not $tunnelProcess.HasExited) {
    Stop-Process -Id $tunnelProcess.Id -Force
  }
  $tail = if (Test-Path -LiteralPath $stderrPath) { (Get-Content -LiteralPath $stderrPath -Tail 20) -join [Environment]::NewLine } else { "No cloudflared log was produced." }
  throw "cloudflared did not publish a Quick Tunnel URL within $StartupTimeoutSeconds seconds.`n$tail"
}

Update-GatewayUrl

$publicHealth = $null
$publicHealthError = "unknown error"
$publicDeadline = (Get-Date).AddSeconds($PublicVerifyTimeoutSeconds)
while ((Get-Date) -lt $publicDeadline -and -not $publicHealth) {
  try {
    $candidate = Invoke-WebRequest -UseBasicParsing -Uri "$script:tunnelUrl/api/health" -TimeoutSec 5
    if ($candidate.StatusCode -eq 200) {
      $publicHealth = $candidate
      break
    }
    $publicHealthError = "HTTP $($candidate.StatusCode)"
  } catch {
    $publicHealthError = $_.Exception.Message
  }
  Start-Sleep -Seconds 2
}

if (-not $publicHealth) {
  if ($tunnelProcess.HasExited) {
    throw "cloudflared exited before the Quick Tunnel became reachable: $script:tunnelUrl. $publicHealthError"
  }
  Write-Warning "Quick Tunnel DNS is still propagating for $script:tunnelUrl. Continuing with the URL in .env. Last check: $publicHealthError"
}

if (-not $SkipCommerceRestart) {
  Ensure-ComposeSigningSecret
  Push-Location $projectRoot
  try {
    & docker compose up -d --no-deps --force-recreate commerce-service
    if ($LASTEXITCODE -ne 0) {
      throw "Commerce restart failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

Write-Output "QUICK_TUNNEL_URL=$script:tunnelUrl"
Write-Output "WEB_GATEWAY_URL updated in $envPath"
if ($publicHealth) {
  Write-Output "PUBLIC_HEALTH=200"
} else {
  Write-Output "PUBLIC_HEALTH=not-yet-reachable"
}
if ($SkipCommerceRestart) {
  Write-Output "Commerce restart skipped; restart commerce-service before testing Stripe Checkout."
} else {
  Write-Output "commerce-service recreated with the new Stripe return URL."
}
