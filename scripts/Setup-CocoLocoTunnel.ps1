$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host '=== COCOLOCO - CONFIGURACION UNICA DEL TUNEL ===' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Esta configuracion se hace UNA SOLA VEZ.' -ForegroundColor White
Write-Host 'Necesitas un dominio que este agregado a tu cuenta de Cloudflare.' -ForegroundColor Yellow
Write-Host ''

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host 'cloudflared no esta disponible en PATH.' -ForegroundColor Red
    Write-Host 'Instala cloudflared y vuelve a ejecutar este archivo.' -ForegroundColor Red
    Read-Host 'ENTER para salir'
    exit 1
}

$hostname = Read-Host 'Escribe el dominio/hostname permanente que quieres usar (ej. live.tudominio.com)'
$hostname = $hostname.Trim().ToLower()
if ([string]::IsNullOrWhiteSpace($hostname) -or $hostname -notmatch '^[a-z0-9.-]+$') {
    Write-Host 'Hostname invalido.' -ForegroundColor Red
    Read-Host 'ENTER para salir'
    exit 1
}

Write-Host ''
Write-Host 'Abriendo Cloudflare para autorizar la cuenta...' -ForegroundColor Yellow
cloudflared tunnel login

$existing = cloudflared tunnel list 2>$null | Select-String 'cocoloco-live'
if ($existing) {
    Write-Host 'El tunel cocoloco-live ya existe; se reutilizara.' -ForegroundColor Green
} else {
    cloudflared tunnel create cocoloco-live
}

$list = cloudflared tunnel list 2>$null | Select-String 'cocoloco-live'
if (-not $list) {
    Write-Host 'No se pudo encontrar el tunel cocoloco-live.' -ForegroundColor Red
    Read-Host 'ENTER para salir'
    exit 1
}

$line = $list.ToString()
$match = [regex]::Match($line, '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}')
if (-not $match.Success) {
    Write-Host 'No se pudo obtener el Tunnel ID.' -ForegroundColor Red
    Read-Host 'ENTER para salir'
    exit 1
}
$tunnelId = $match.Value

$configDir = Join-Path $env:USERPROFILE '.cloudflared'
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
$configPath = Join-Path $configDir 'cocoloco-config.yml'
$credentials = Join-Path $configDir "$tunnelId.json"

@"
tunnel: $tunnelId
credentials-file: $credentials
ingress:
  - hostname: $hostname
    service: http://127.0.0.1:5173
  - service: http_status:404
"@ | Set-Content -Path $configPath -Encoding UTF8

cloudflared tunnel route dns cocoloco-live $hostname

Set-Content -Path (Join-Path $ProjectRoot '.cocoloco-tunnel-hostname') -Value $hostname -Encoding UTF8

Write-Host ''
Write-Host 'TUNEL PERMANENTE CONFIGURADO.' -ForegroundColor Green
Write-Host "Panel:   https://$hostname/" -ForegroundColor Green
Write-Host "Overlay: https://$hostname/overlay" -ForegroundColor Green
Write-Host ''
Write-Host 'A partir de ahora el launcher normal usara esa misma URL.' -ForegroundColor Cyan
Write-Host 'No necesitas repetir esta configuracion despues de reiniciar Windows.' -ForegroundColor Cyan
Read-Host 'ENTER para terminar'
