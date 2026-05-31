# oddyCRM - Gelistirme Ortami Baslatici
# Kullanim: .\start.ps1

$ROOT = $PSScriptRoot
$NPM  = "C:\Program Files\nodejs\npm.cmd"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   oddyCRM - Gelistirme Ortami          " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Docker container
Write-Host "[1/4] PostgreSQL container kontrol ediliyor..." -ForegroundColor Yellow
$status = docker inspect --format "{{.State.Status}}" siarem_db 2>$null
if ($status -ne "running") {
    Write-Host "      Baslatiliyor: siarem_db..." -ForegroundColor Gray
    docker start siarem_db | Out-Null
    Start-Sleep -Seconds 3
}
Write-Host "      siarem_db calisıyor (port 5440)" -ForegroundColor Green

# 2. Migrationlar
Write-Host "[2/4] Veritabani migration kontrol ediliyor..." -ForegroundColor Yellow
Push-Location "$ROOT\backend"
$migOut = & ".\node_modules\.bin\prisma.cmd" migrate deploy 2>&1 | Out-String
$migExit = $LASTEXITCODE
Pop-Location
if ($migExit -ne 0) {
    Write-Host "      HATA: $migOut" -ForegroundColor Red
    exit 1
}
Write-Host "      Migration tamam" -ForegroundColor Green

# 3. Backend
Write-Host "[3/4] Backend kontrol ediliyor (port 3001)..." -ForegroundColor Yellow
$backendRunning = $false
try {
    $null = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -ErrorAction Stop
    $backendRunning = $true
} catch {}

if ($backendRunning) {
    Write-Host "      Backend zaten calisıyor: http://localhost:3001" -ForegroundColor Green
} else {
    $backendLog = "$env:TEMP\oddycrm-backend.log"
    "" | Out-File $backendLog  # log dosyasını temizle
    Start-Process -NoNewWindow `
        -FilePath $NPM `
        -ArgumentList "run", "dev" `
        -WorkingDirectory "$ROOT\backend" `
        -RedirectStandardOutput $backendLog `
        -RedirectStandardError "$env:TEMP\oddycrm-backend-err.log"

    $ready = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        $log = Get-Content $backendLog -ErrorAction SilentlyContinue | Out-String
        if ($log -match "Server running") { $ready = $true; break }
    }
    if ($ready) {
        Write-Host "      Backend hazir: http://localhost:3001" -ForegroundColor Green
    } else {
        Write-Host "      Backend yavas basliyor, devam ediliyor..." -ForegroundColor DarkYellow
    }
}

# 4. Frontend
Write-Host "[4/4] Frontend kontrol ediliyor (port 5173)..." -ForegroundColor Yellow
$frontendRunning = $false
try {
    $null = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -ErrorAction Stop
    $frontendRunning = $true
} catch {}

if ($frontendRunning) {
    Write-Host "      Frontend zaten calisıyor: http://localhost:5173" -ForegroundColor Green
} else {
    $frontendLog = "$env:TEMP\oddycrm-frontend.log"
    "" | Out-File $frontendLog  # log dosyasını temizle
    Start-Process -NoNewWindow `
        -FilePath $NPM `
        -ArgumentList "run", "dev" `
        -WorkingDirectory "$ROOT\frontend" `
        -RedirectStandardOutput $frontendLog `
        -RedirectStandardError "$env:TEMP\oddycrm-frontend-err.log"

    $ready = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        $log = Get-Content $frontendLog -ErrorAction SilentlyContinue | Out-String
        if ($log -match "Local") { $ready = $true; break }
    }
    if ($ready) {
        Write-Host "      Frontend hazir: http://localhost:5173" -ForegroundColor Green
    } else {
        Write-Host "      Frontend yavas basliyor, devam ediliyor..." -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Tum servisler calisıyor!             " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Uygulama  : http://localhost:5173" -ForegroundColor White
Write-Host "   Backend   : http://localhost:3001" -ForegroundColor White
Write-Host "   Veritabani: localhost:5440" -ForegroundColor White
Write-Host ""
Write-Host "   Super Admin  : admin@siarem.com / SuperAdmin123!" -ForegroundColor Gray
Write-Host "   Normal Admin : admin@oddyship.com / Admin123!" -ForegroundColor Gray
Write-Host ""
Write-Host "   Loglar: $env:TEMP\oddycrm-backend.log" -ForegroundColor DarkGray
Write-Host "           $env:TEMP\oddycrm-frontend.log" -ForegroundColor DarkGray
Write-Host ""
