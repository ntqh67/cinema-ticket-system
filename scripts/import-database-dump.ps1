<#
  Mục đích: Script PowerShell phục vụ sao lưu/khôi phục cơ sở dữ liệu PostgreSQL.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$DumpPath = Join-Path $ProjectRoot "database\cinema_ticket_system_dump.sql"

if (!(Test-Path $DumpPath)) {
  throw "Khong tim thay file dump: $DumpPath"
}

Push-Location $ProjectRoot
try {
  Write-Host "Dang chay Docker PostgreSQL/Redis..."
  docker compose up -d postgres redis

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

  Write-Host "Dang import dump vao database cinema_ticket_system..."
  Get-Content -Raw -Encoding UTF8 $DumpPath | docker compose exec -T postgres psql -U postgres -d cinema_ticket_system

  Write-Host "Dang generate Prisma Client..."
  npx.cmd prisma generate

  Write-Host "Hoan tat import database dump."
}
finally {
  Pop-Location
}
