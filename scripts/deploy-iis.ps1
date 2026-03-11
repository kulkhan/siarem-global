# =============================================================
# oddyCRM — IIS Deploy / Güncelleme (Windows Server 2012+)
# Yönetici olarak çalıştırın:
#   .\scripts\deploy-iis.ps1 -Fresh    # İlk deploy (seed dahil)
#   .\scripts\deploy-iis.ps1 -Update   # Kod güncellemesi (veri korunur)
# =============================================================

param(
    [switch]$Fresh,
    [switch]$Update
)

$ErrorActionPreference = "Stop"

# ---------- Yapılandırma ----------
$RepoDir    = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$AppDir     = "C:\inetpub\oddycrm"
$FrontDir   = "$AppDir\frontend"
$BackDir    = "$AppDir\backend"
$UploadsDir = "$AppDir\uploads"
$EnvFile    = "$BackDir\.env"

Write-Host "=== oddyCRM Deploy ===" -ForegroundColor Cyan
Write-Host "Repo: $RepoDir" -ForegroundColor Gray

# ---------- Ön kontroller ----------
if (-not (Test-Path $EnvFile)) {
    Write-Host "HATA: $EnvFile bulunamadı!" -ForegroundColor Red
    Write-Host "Önce .\scripts\setup-iis.ps1 çalıştırın."
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "HATA: Node.js bulunamadı. PATH'i kontrol edin." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Host "HATA: PM2 bulunamadı. 'npm install -g pm2' çalıştırın." -ForegroundColor Red
    exit 1
}

# ---------- Yardımcı fonksiyon ----------
function Run($cmd, $dir = $RepoDir) {
    Push-Location $dir
    try {
        Invoke-Expression $cmd
        if ($LASTEXITCODE -ne 0) { throw "Komut başarısız: $cmd" }
    } finally {
        Pop-Location
    }
}

# ---------- 1. Backend build ----------
Write-Host ""
Write-Host "[1/5] Backend derleniyor..." -ForegroundColor Yellow
$BackSrc = "$RepoDir\backend"

Run "npm ci --prefer-offline" $BackSrc
Run "npx prisma generate" $BackSrc
Run "npm run build" $BackSrc       # → $BackSrc\dist

# ---------- 2. Backend dosyaları kopyala ----------
Write-Host "[2/5] Backend dosyaları kopyalanıyor..." -ForegroundColor Yellow

# Önce PM2'yi durdur (dosya kilidi önlemek için)
pm2 stop oddycrm-backend 2>$null; $true

# dist, node_modules, prisma, package.json kopyala
@("dist", "prisma", "package.json", "package-lock.json", "ecosystem.config.js") | ForEach-Object {
    $src = "$BackSrc\$_"
    if (Test-Path $src) {
        Copy-Item $src "$BackDir\$_" -Recurse -Force
    }
}

# Production bağımlılıkları kur
Run "npm ci --omit=dev --prefer-offline" $BackDir

# Uploads klasörünü .env ile senkronize et
New-Item -ItemType Directory -Path "$UploadsDir\logos"    -Force | Out-Null
New-Item -ItemType Directory -Path "$UploadsDir\cert-docs" -Force | Out-Null

# ---------- 3. Veritabanı migration ----------
Write-Host "[3/5] Veritabanı migration'ları uygulanıyor..." -ForegroundColor Yellow
$env:$(Get-Content $EnvFile | Where-Object {$_ -match "^DATABASE_URL"} | ForEach-Object {$_.Split("=",2)[0]}) = `
    (Get-Content $EnvFile | Where-Object {$_ -match "^DATABASE_URL"} | ForEach-Object {$_.Split("=",2)[1]})

# .env'i ortam değişkenlerine yükle
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]+)=(.+)$") {
        [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), "Process")
    }
}

Run "npx prisma migrate deploy" $BackDir

# ---------- 4. Seed (sadece -Fresh) ----------
if ($Fresh) {
    Write-Host "[4/5] Seed verisi yükleniyor..." -ForegroundColor Yellow
    Run "npx tsx prisma/seed.ts" "$RepoDir\backend"
} else {
    Write-Host "[4/5] Seed atlandı (-Update modu)." -ForegroundColor Gray
}

# ---------- 5. Frontend build ----------
Write-Host "[5/5] Frontend derleniyor ve kopyalanıyor..." -ForegroundColor Yellow
$FrontSrc = "$RepoDir\frontend"

Run "npm ci --prefer-offline" $FrontSrc

# reCAPTCHA site key'i .env'den oku (opsiyonel)
$siteKey = (Get-Content $EnvFile | Where-Object {$_ -match "^VITE_RECAPTCHA_SITE_KEY"} | ForEach-Object {$_.Split("=",2)[1]})
if ($siteKey) { $env:VITE_RECAPTCHA_SITE_KEY = $siteKey }

Run "npm run build" $FrontSrc      # → $FrontSrc\dist

# IIS webroot'u güncelle (atomic: temp → final)
$TempFront = "$AppDir\frontend_new"
if (Test-Path $TempFront) { Remove-Item $TempFront -Recurse -Force }
Copy-Item "$FrontSrc\dist" $TempFront -Recurse -Force

# web.config kopyala (IIS URL Rewrite + SPA)
Copy-Item "$FrontSrc\web.config" "$TempFront\web.config" -Force

# Swap
$OldFront = "$AppDir\frontend_old"
if (Test-Path $OldFront) { Remove-Item $OldFront -Recurse -Force }
if (Test-Path $FrontDir) { Rename-Item $FrontDir $OldFront }
Rename-Item $TempFront $FrontDir

# ---------- 6. Backend'i başlat ----------
Write-Host ""
Write-Host "Backend başlatılıyor (PM2)..." -ForegroundColor Yellow
$EcosystemFile = "$BackDir\ecosystem.config.js"

$pm2list = pm2 list --no-color 2>&1 | Select-String "oddycrm-backend"
if ($pm2list) {
    pm2 restart oddycrm-backend
} else {
    pm2 start $EcosystemFile
}

pm2 save

# ---------- IIS Application Pool restart ----------
Write-Host "IIS uygulama havuzu yeniden başlatılıyor..." -ForegroundColor Yellow
Import-Module WebAdministration -ErrorAction SilentlyContinue
Restart-WebAppPool -Name "DefaultAppPool" -ErrorAction SilentlyContinue
iisreset /noforce 2>$null; $true

# ---------- Durum ----------
Write-Host ""
Write-Host "=== Deploy Tamamlandı ===" -ForegroundColor Green
Write-Host ""
pm2 status
Write-Host ""
Write-Host "Uygulama: http://localhost" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3001/api/health" -ForegroundColor Gray
Write-Host ""
Write-Host "Loglar: pm2 logs oddycrm-backend" -ForegroundColor Gray
