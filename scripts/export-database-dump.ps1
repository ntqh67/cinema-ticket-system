<#
  Mục đích: Script PowerShell phục vụ sao lưu/khôi phục cơ sở dữ liệu PostgreSQL.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$DumpPath = Join-Path $ProjectRoot "database\cinema_ticket_system_dump.sql"

Push-Location $ProjectRoot
try {
  Write-Host "Dang chay Docker PostgreSQL neu chua chay..."
  docker compose up -d postgres

  Write-Host "Dang doi PostgreSQL san sang..."
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    docker compose exec -T postgres pg_isready -U postgres -d cinema_ticket_system | Out-Null
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }

  if (!$ready) {
    throw "PostgreSQL chua san sang. Hay kiem tra Docker Desktop va docker compose logs postgres."
  }

  Write-Host "Dang export database ra dump..."
  docker compose exec -T postgres pg_dump -U postgres -d cinema_ticket_system --clean --if-exists --no-owner --no-privileges |
    Set-Content -Encoding UTF8 $DumpPath
  if ($LASTEXITCODE -ne 0) {
    throw "Export database that bai voi ma loi $LASTEXITCODE. File dump khong duoc phep dung de chia se."
  }

  Write-Host "Da export dump: $DumpPath"
}
finally {
  Pop-Location
}
