# Requires: pnpm (10.34.5), Docker with compose v2, and (for full validation)
# a local PostgreSQL/RabbitMQ stack (`docker compose up -d postgres message-broker`).
# Runs every quality gate in dependency order. New gates are appended here as
# they land (MICROSERVICE_100_PLAN.md Phase 0 exit gate).
$ErrorActionPreference = "Stop"

$steps = @(
  @{ Name = "type-check"; Cmd = { pnpm.cmd type-check } },
  @{ Name = "lint"; Cmd = { pnpm.cmd lint } },
  @{ Name = "contract-tests"; Cmd = { pnpm.cmd --filter @atelier/contracts test } },
  @{ Name = "build"; Cmd = { pnpm.cmd build } }
)

$failed = @()
foreach ($step in $steps) {
  Write-Host "==> $($step.Name)" -ForegroundColor Cyan
  & $step.Cmd
  if ($LASTEXITCODE -ne 0) { $failed += $step.Name }
}

if ($failed.Count -gt 0) {
  Write-Host "FAILED: $($failed -join ', ')" -ForegroundColor Red
  exit 1
}
Write-Host "All validation gates passed." -ForegroundColor Green
