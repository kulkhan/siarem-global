# =============================================================
# oddyCRM — IIS İlk Kurulum (Windows Server 2012+)
# Yönetici olarak tek seferlik çalıştırın:
#   Set-ExecutionPolicy RemoteSigned -Scope Process
#   .\scripts\setup-iis.ps1
#
# Gereksinimler (önceden kurulmuş olmalı):
#   - IIS + URL Rewrite 2.x  (https://www.iis.net/downloads/microsoft/url-rewrite)
#   - IIS + ARR 3.x          (https://www.iis.net/downloads/microsoft/application-request-routing)
#   - Node.js 22.x           (https://nodejs.org)
#   - PostgreSQL              (psql PATH'de erişilebilir)
#   - Git                    (PATH'de erişilebilir)
# =============================================================

$ErrorActionPreference = "Stop"

# ---------- Yapılandırma ----------
$AppName    = "oddyCRM"
$SiteName   = "oddyCRM"
$AppDir     = "C:\inetpub\oddycrm"
$FrontDir   = "$AppDir\frontend"       # IIS web root
$BackDir    = "$AppDir\backend"        # Node.js uygulaması
$UploadsDir = "$AppDir\uploads"
$RepoDir    = "C:\repos\siarem-global" # Bu repo'nun yolu (deploy sırasında buradan build alınır)
$Port       = 80
$NodePort   = 3001

Write-Host "=== oddyCRM IIS Kurulumu ===" -ForegroundColor Cyan

# ---------- 1. Klasörler ----------
Write-Host "1. Klasörler oluşturuluyor..." -ForegroundColor Yellow
@($AppDir, $FrontDir, $BackDir, "$UploadsDir\logos", "$UploadsDir\cert-docs") | ForEach-Object {
    New-Item -ItemType Directory -Path $_ -Force | Out-Null
}

# ---------- 2. PM2 kurulumu ----------
Write-Host "2. PM2 kuruluyor..." -ForegroundColor Yellow
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install

# ---------- 3. Backend .env ----------
$EnvFile = "$BackDir\.env"
if (-not (Test-Path $EnvFile)) {
    Write-Host "3. Backend .env oluşturuluyor..." -ForegroundColor Yellow

    $DbPass  = Read-Host "PostgreSQL şifresi"
    $DbUser  = Read-Host "PostgreSQL kullanıcı adı (varsayılan: oddycrm)"
    if (-not $DbUser) { $DbUser = "oddycrm" }
    $DbName  = Read-Host "PostgreSQL DB adı (varsayılan: oddycrm)"
    if (-not $DbName) { $DbName = "oddycrm" }
    $ServerUrl = Read-Host "Sunucu URL (örn: http://192.168.1.100)"
    $AdminDomain = Read-Host "Admin subdomain (örn: admin.siarem.com)"
    $RecaptchaSecret = Read-Host "reCAPTCHA Secret Key (boş bırakabilirsiniz, sonra düzenleyin)"

    # JWT secret oluştur
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $JwtSecret = [Convert]::ToBase64String($bytes)

    @"
DATABASE_URL=postgresql://${DbUser}:${DbPass}@localhost:5432/${DbName}
JWT_SECRET=${JwtSecret}
JWT_EXPIRES_IN=7d
PORT=${NodePort}
NODE_ENV=production
UPLOAD_DIR=${UploadsDir}
FRONTEND_URL=${ServerUrl}
ADMIN_DOMAIN=${AdminDomain}
RECAPTCHA_SECRET_KEY=${RecaptchaSecret}
"@ | Set-Content $EnvFile -Encoding UTF8

    Write-Host "   .env oluşturuldu: $EnvFile" -ForegroundColor Green
} else {
    Write-Host "3. .env zaten mevcut, atlandı." -ForegroundColor Gray
}

# ---------- 4. PostgreSQL DB ve kullanıcı ----------
Write-Host "4. Veritabanı oluşturuluyor (varsa atlanır)..." -ForegroundColor Yellow
$env_content = Get-Content $EnvFile | Where-Object { $_ -match "DATABASE_URL" }
Write-Host "   Lütfen psql ile aşağıdaki komutları çalıştırın (gerekiyorsa):" -ForegroundColor Gray
Write-Host "   CREATE USER oddycrm WITH PASSWORD 'sifreniz';" -ForegroundColor Gray
Write-Host "   CREATE DATABASE oddycrm OWNER oddycrm;" -ForegroundColor Gray

# ---------- 5. IIS Site kurulumu ----------
Write-Host "5. IIS sitesi yapılandırılıyor..." -ForegroundColor Yellow
Import-Module WebAdministration

# Varsayılan siteyi durdur
if (Get-Website -Name "Default Web Site" -ErrorAction SilentlyContinue) {
    Stop-Website -Name "Default Web Site"
    Set-WebConfiguration system.applicationHost/sites/site[@name='Default Web Site']/bindings "" -Force
}

# oddyCRM sitesi oluştur
if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
    New-Website -Name $SiteName -Port $Port -PhysicalPath $FrontDir -Force
    Write-Host "   IIS sitesi oluşturuldu: $SiteName → $FrontDir" -ForegroundColor Green
} else {
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $FrontDir
    Write-Host "   IIS sitesi güncellendi." -ForegroundColor Green
}

# ARR proxy etkinleştir (sunucu seviyesinde)
Set-WebConfigurationProperty -Filter system.webServer/proxy -Name enabled -Value true -PSPath "IIS:\"

Start-Website -Name $SiteName

# ---------- 6. PM2 ecosystem dosyası ----------
Write-Host "6. PM2 ecosystem dosyası yazılıyor..." -ForegroundColor Yellow
@"
module.exports = {
  apps: [{
    name: 'oddycrm-backend',
    script: 'dist/server.js',
    cwd: '$($BackDir -replace '\\', '\\\\')',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
    },
  }],
};
"@ | Set-Content "$BackDir\ecosystem.config.js" -Encoding UTF8

Write-Host "" -ForegroundColor White
Write-Host "=== Kurulum Tamamlandı ===" -ForegroundColor Green
Write-Host "Sonraki adım: .\scripts\deploy-iis.ps1 -Fresh" -ForegroundColor Cyan
Write-Host ""
Write-Host "IIS Modül Kontrol Listesi:" -ForegroundColor Yellow
Write-Host "  [ ] URL Rewrite 2.x kurulu mu?  → iis.net/downloads/microsoft/url-rewrite"
Write-Host "  [ ] ARR 3.x kurulu mu?           → iis.net/downloads/microsoft/application-request-routing"
Write-Host "  [ ] ARR proxy etkin mi?          → IIS Manager > sunucu > ARR > Proxy > Enable"
