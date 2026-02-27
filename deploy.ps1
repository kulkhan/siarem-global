# oddyCRM Windows Server Deploy Script
# PowerShell olarak çalıştırın: .\deploy.ps1

param(
    [switch]$Fresh,    # İlk kurulum: DB seed dahil
    [switch]$Update    # Sadece güncelleme (veri korunur)
)

$ErrorActionPreference = "Stop"
$ComposeFile = "docker-compose.prod.yml"
$EnvFile = ".env.production"

Write-Host "=== oddyCRM Deploy ===" -ForegroundColor Cyan

# .env.production kontrolü
if (-not (Test-Path $EnvFile)) {
    Write-Host "HATA: $EnvFile bulunamadı!" -ForegroundColor Red
    Write-Host "Önce .env.production.example dosyasını $EnvFile olarak kopyalayın ve doldurun."
    exit 1
}

# Docker çalışıyor mu?
try {
    docker info | Out-Null
} catch {
    Write-Host "HATA: Docker çalışmıyor. Docker Desktop'ı başlatın." -ForegroundColor Red
    exit 1
}

if ($Update) {
    Write-Host "Güncelleme modu — veriler korunacak..." -ForegroundColor Yellow
    docker compose -f $ComposeFile --env-file $EnvFile build --no-cache backend frontend
    docker compose -f $ComposeFile --env-file $EnvFile up -d
    Write-Host "✓ Güncelleme tamamlandı" -ForegroundColor Green
}
elseif ($Fresh) {
    Write-Host "İlk kurulum modu..." -ForegroundColor Yellow
    docker compose -f $ComposeFile --env-file $EnvFile down -v
    docker compose -f $ComposeFile --env-file $EnvFile build --no-cache
    docker compose -f $ComposeFile --env-file $EnvFile up -d

    Write-Host "Veritabanı hazır olana kadar bekleniyor..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    Write-Host "Seed verisi yükleniyor..." -ForegroundColor Yellow
    docker exec oddycrm_backend npx tsx prisma/seed.ts

    Write-Host "✓ İlk kurulum tamamlandı" -ForegroundColor Green
}
else {
    Write-Host "Kullanım:" -ForegroundColor Yellow
    Write-Host "  .\deploy.ps1 -Fresh    # İlk kurulum (veri sıfırlanır!)"
    Write-Host "  .\deploy.ps1 -Update   # Güncelleme (veri korunur)"
    exit 0
}

# Durum göster
Write-Host ""
Write-Host "=== Servis Durumu ===" -ForegroundColor Cyan
docker compose -f $ComposeFile --env-file $EnvFile ps

$port = (Get-Content $EnvFile | Select-String "APP_PORT=(\d+)" | ForEach-Object { $_.Matches[0].Groups[1].Value })
if (-not $port) { $port = "80" }

Write-Host ""
Write-Host "✓ Uygulama çalışıyor: http://localhost:$port" -ForegroundColor Green
Write-Host "  Admin: admin@oddyship.com / Admin123!" -ForegroundColor Gray
