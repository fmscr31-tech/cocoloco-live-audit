$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host '=== COCOLOCO LIVE MANAGER ===' -ForegroundColor Cyan
Write-Host 'Starting local services...' -ForegroundColor White

# Start the application (Vite + bridge) in its own window.
Start-Process powershell.exe -ArgumentList '-NoExit','-Command',"Set-Location -LiteralPath '$ProjectRoot'; npm run dev"

# Wait for Vite to answer locally.
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
    Write-Host 'ERROR: Vite did not become available on port 5173.' -ForegroundColor Red
    Read-Host 'Press ENTER to close'
    exit 1
}

# A stable named Cloudflare Tunnel is preferred. Configure it once with:
#   .\scripts\Setup-CocoLocoTunnel.ps1
$configPath = Join-Path $env:USERPROFILE '.cloudflared\cocoloco-config.yml'
$hostnameFile = Join-Path $ProjectRoot '.cocoloco-tunnel-hostname'

if (Test-Path $configPath) {
    $hostname = if (Test-Path $hostnameFile) { (Get-Content $hostnameFile -Raw).Trim() } else { '' }
    Write-Host "Starting Cloudflare Tunnel${hostname}..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList '-NoExit','-Command',"cloudflared tunnel --config `"$configPath`" run"

    if ($hostname) {
        $publicBase = "https://$hostname"
        Set-Clipboard -Value "$publicBase/overlay"
        Start-Process $publicBase
        Start-Process "$publicBase/"
        Write-Host ''
        Write-Host "PUBLIC PANEL:   $publicBase/" -ForegroundColor Green
        Write-Host "PUBLIC OVERLAY: $publicBase/overlay" -ForegroundColor Green
        Write-Host 'The overlay URL has been copied to the clipboard.' -ForegroundColor Green
        Write-Host ''
        Read-Host 'Press ENTER to close this launcher window (services remain running)'
        exit 0
    }
}

# Fallback for first-time testing: Quick Tunnel. Its URL changes when restarted.
Write-Host 'No stable named tunnel is configured. Starting a temporary Quick Tunnel...' -ForegroundColor Yellow
$log = Join-Path $env:TEMP 'cocoloco-cloudflared.log'
Remove-Item $log -Force -ErrorAction SilentlyContinue
Start-Process powershell.exe -ArgumentList '-NoExit','-Command',"cloudflared tunnel --url http://127.0.0.1:5173 2>&1 | Tee-Object -FilePath `"$log`""

$publicBase = $null
for ($i = 0; $i -lt 30 -and -not $publicBase; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $log) {
        $text = Get-Content $log -Raw -ErrorAction SilentlyContinue
        $m = [regex]::Match($text, 'https://[a-z0-9-]+\.trycloudflare\.com')
        if ($m.Success) { $publicBase = $m.Value }
    }
}

if (-not $publicBase) {
    Write-Host 'ERROR: Cloudflare did not provide a public URL.' -ForegroundColor Red
    Read-Host 'Press ENTER to close'
    exit 1
}

$overlayUrl = "$publicBase/overlay"
Set-Clipboard -Value $overlayUrl
Start-Process $publicBase
Start-Process $overlayUrl

Write-Host ''
Write-Host "TEMPORARY PANEL:   $publicBase/" -ForegroundColor Green
Write-Host "TEMPORARY OVERLAY: $overlayUrl" -ForegroundColor Green
Write-Host 'The overlay URL has been copied to the clipboard.' -ForegroundColor Green
Write-Host 'IMPORTANT: this Quick Tunnel URL changes after restart. Use the one-time setup for a permanent URL.' -ForegroundColor Yellow
Write-Host ''
Read-Host 'Press ENTER to close this launcher window (services remain running)'
