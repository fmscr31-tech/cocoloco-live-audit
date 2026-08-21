$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Require-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "$name no esta disponible en PATH."
    }
}

Require-Command 'node'
Require-Command 'npm'
Require-Command 'cloudflared'

$logDir = Join-Path $env:TEMP 'CocoLocoLiveManager'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$cloudLog = Join-Path $logDir 'cloudflared.log'
$cloudErr = Join-Path $logDir 'cloudflared.err.log'
Remove-Item $cloudLog,$cloudErr -Force -ErrorAction SilentlyContinue

Write-Host '=== COCOLOCO LIVE MANAGER ===' -ForegroundColor Cyan
Write-Host 'Creando URL publica temporal automaticamente...' -ForegroundColor White

# Create the Quick Tunnel first so we know its hostname before Vite starts.
$cloud = Start-Process -FilePath 'cloudflared.exe' `
    -ArgumentList @('tunnel','--url','http://127.0.0.1:5173') `
    -RedirectStandardOutput $cloudLog `
    -RedirectStandardError $cloudErr `
    -PassThru

$publicUrl = $null
$deadline = (Get-Date).AddSeconds(45)
while ((Get-Date) -lt $deadline -and -not $publicUrl) {
    Start-Sleep -Milliseconds 500
    foreach ($file in @($cloudLog,$cloudErr)) {
        if (Test-Path $file) {
            $text = Get-Content $file -Raw -ErrorAction SilentlyContinue
            if (-not [string]::IsNullOrWhiteSpace($text)) {
                $m = [regex]::Match($text, 'https://[a-z0-9-]+\.trycloudflare\.com')
                if ($m.Success) { $publicUrl = $m.Value; break }
            }
        }
    }
}

if (-not $publicUrl) {
    if (-not $cloud.HasExited) { Stop-Process -Id $cloud.Id -Force -ErrorAction SilentlyContinue }
    throw "Cloudflare no entrego una URL publica. Revisa $cloudLog y $cloudErr"
}

$publicHost = ([uri]$publicUrl).Host
$overlayUrl = "$publicUrl/overlay"

Write-Host "URL publica: $publicUrl" -ForegroundColor Green
Write-Host 'Iniciando Vite con el host de Cloudflare permitido...' -ForegroundColor Yellow

$vite = Start-Process -FilePath 'npm.cmd' `
    -ArgumentList @('run','vite','--','--host','0.0.0.0','--allowed-hosts',$publicHost) `
    -WorkingDirectory $root `
    -PassThru

Write-Host 'Iniciando bridge...' -ForegroundColor Yellow
$bridge = Start-Process -FilePath 'node.exe' `
    -ArgumentList @('bridge/server.js') `
    -WorkingDirectory $root `
    -PassThru

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
            $ready = $true
            break
        }
    } catch {}
}

if (-not $ready) {
    throw 'Vite no respondio en http://127.0.0.1:5173.'
}

Set-Clipboard -Value $overlayUrl
Start-Process "$publicUrl/"

Write-Host ''
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host ' COCOLOCO LIVE MANAGER LISTO' -ForegroundColor Green
Write-Host " PANEL:   $publicUrl/" -ForegroundColor Green
Write-Host " OVERLAY: $overlayUrl" -ForegroundColor Green
Write-Host ' OVERLAY COPIADO AL PORTAPAPELES' -ForegroundColor Green
Write-Host '==========================================' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Deja esta ventana abierta durante el LIVE.' -ForegroundColor Yellow
Write-Host 'Cuando termines, cierra esta ventana para detener Vite, bridge y Cloudflare.' -ForegroundColor Yellow
Write-Host ''

try {
    while ($true) {
        Start-Sleep -Seconds 2
        if ($vite.HasExited -or $bridge.HasExited -or $cloud.HasExited) {
            Write-Warning 'Uno de los procesos principales se detuvo.'
            break
        }
    }
}
finally {
    foreach ($process in @($bridge,$vite,$cloud)) {
        if ($process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }
}
