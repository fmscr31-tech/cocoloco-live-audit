$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Require-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "$name no esta disponible en PATH."
    }
}

function Stop-PortOwner($port) {
    $connections = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    foreach ($connection in $connections) {
        $ownerPid = $connection.OwningProcess
        if ($ownerPid -and $ownerPid -ne 0) {
            $process = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Liberando puerto ${port} (PID ${ownerPid}: $($process.ProcessName))..." -ForegroundColor DarkYellow
                Stop-Process -Id $ownerPid -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

function Tail-Log($path, $lines = 20) {
    if (Test-Path $path) {
        Write-Host "--- $path ---" -ForegroundColor DarkGray
        Get-Content $path -Tail $lines -ErrorAction SilentlyContinue
    }
}

Require-Command 'node'
Require-Command 'npm'
Require-Command 'cloudflared'

$logDir = Join-Path $env:TEMP 'CocoLocoLiveManager'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$viteOut = Join-Path $logDir 'vite.log'
$viteErr = Join-Path $logDir 'vite.err.log'
$bridgeOut = Join-Path $logDir 'bridge.log'
$bridgeErr = Join-Path $logDir 'bridge.err.log'
$cloudOut = Join-Path $logDir 'cloudflared.log'
$cloudErr = Join-Path $logDir 'cloudflared.err.log'
Remove-Item $viteOut,$viteErr,$bridgeOut,$bridgeErr,$cloudOut,$cloudErr -Force -ErrorAction SilentlyContinue

Write-Host '=== COCOLOCO LIVE MANAGER ===' -ForegroundColor Cyan
Write-Host 'Preparando servicios...' -ForegroundColor White

Stop-PortOwner 5173
Stop-PortOwner 8080

$vite = $null
$bridge = $null
$cloud = $null

try {
    Write-Host 'Iniciando Vite...' -ForegroundColor Yellow
    $vite = Start-Process -FilePath 'npm.cmd' `
        -ArgumentList @('run','vite','--','--host','0.0.0.0') `
        -WorkingDirectory $root `
        -RedirectStandardOutput $viteOut `
        -RedirectStandardError $viteErr `
        -PassThru

    $viteReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if ($vite.HasExited) {
            Tail-Log $viteErr
            Tail-Log $viteOut
            throw 'Vite se cerro antes de quedar disponible.'
        }
        try {
            $r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
                $viteReady = $true
                break
            }
        } catch {}
    }
    if (-not $viteReady) {
        Tail-Log $viteErr
        Tail-Log $viteOut
        throw 'Vite no respondio en http://127.0.0.1:5173.'
    }

    Write-Host 'Vite listo.' -ForegroundColor Green

    Write-Host 'Iniciando bridge...' -ForegroundColor Yellow
    $bridge = Start-Process -FilePath 'node.exe' `
        -ArgumentList @('bridge/server.js') `
        -WorkingDirectory $root `
        -RedirectStandardOutput $bridgeOut `
        -RedirectStandardError $bridgeErr `
        -PassThru

    Start-Sleep -Seconds 2
    if ($bridge.HasExited) {
        Tail-Log $bridgeErr
        Tail-Log $bridgeOut
        throw 'El bridge se cerro al iniciar.'
    }

    $bridgeReady = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 500
        if ($bridge.HasExited) {
            Tail-Log $bridgeErr
            Tail-Log $bridgeOut
            throw 'El bridge se cerro antes de quedar disponible.'
        }
        $listen = Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue
        if ($listen) {
            $bridgeReady = $true
            break
        }
    }
    if (-not $bridgeReady) {
        Tail-Log $bridgeErr
        Tail-Log $bridgeOut
        throw 'El bridge no abrio el puerto 8080.'
    }

    Write-Host 'Bridge listo.' -ForegroundColor Green
    Write-Host 'Creando URL publica temporal automaticamente...' -ForegroundColor White

    $cloud = Start-Process -FilePath 'cloudflared.exe' `
        -ArgumentList @('tunnel','--url','http://127.0.0.1:5173') `
        -RedirectStandardOutput $cloudOut `
        -RedirectStandardError $cloudErr `
        -PassThru

    $publicUrl = $null
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline -and -not $publicUrl) {
        Start-Sleep -Milliseconds 500
        if ($cloud.HasExited) {
            Tail-Log $cloudErr
            Tail-Log $cloudOut
            throw 'Cloudflare se cerro antes de entregar una URL publica.'
        }
        foreach ($file in @($cloudOut,$cloudErr)) {
            if (Test-Path $file) {
                $text = Get-Content $file -Raw -ErrorAction SilentlyContinue
                if (-not [string]::IsNullOrWhiteSpace($text)) {
                    $m = [regex]::Match($text, 'https://[a-z0-9-]+\.trycloudflare\.com')
                    if ($m.Success) {
                        $publicUrl = $m.Value
                        break
                    }
                }
            }
        }
    }

    if (-not $publicUrl) {
        Tail-Log $cloudErr
        Tail-Log $cloudOut
        throw 'Cloudflare no entrego una URL publica.'
    }

    $overlayUrl = "$publicUrl/overlay"
    Write-Host "URL publica: $publicUrl" -ForegroundColor Green

    Write-Host 'Esperando propagacion DNS y verificando acceso publico...' -ForegroundColor Yellow
    $publicReady = $false
    $publicDeadline = (Get-Date).AddSeconds(120)
    $lastPublicError = $null

    while ((Get-Date) -lt $publicDeadline) {
        if ($cloud.HasExited) {
            Tail-Log $cloudErr
            throw 'Cloudflare se detuvo mientras se verificaba la URL publica.'
        }

        try {
            Resolve-DnsName -Name ([Uri]$publicUrl).Host -Type A -ErrorAction Stop | Out-Null
            $publicResponse = Invoke-WebRequest -Uri "$publicUrl/" -UseBasicParsing -TimeoutSec 5
            if ($publicResponse.StatusCode -ge 200 -and $publicResponse.StatusCode -lt 500) {
                $publicReady = $true
                break
            }
        } catch {
            $lastPublicError = $_.Exception.Message
        }

        Start-Sleep -Seconds 2
    }

    if (-not $publicReady) {
        Write-Warning "La URL publica todavia no pudo verificarse automaticamente: $publicUrl"
        if ($lastPublicError) {
            Write-Host "Ultimo error: $lastPublicError" -ForegroundColor DarkYellow
        }
        Write-Host 'El tunel sigue activo. No se cerraran los servicios.' -ForegroundColor Yellow
        Write-Host "Prueba manualmente: $publicUrl/" -ForegroundColor Yellow
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

    while ($true) {
        Start-Sleep -Seconds 2
        $stopped = @()
        if ($vite.HasExited) { $stopped += 'Vite' }
        if ($bridge.HasExited) { $stopped += 'bridge' }
        if ($cloud.HasExited) { $stopped += 'Cloudflare' }
        if ($stopped.Count -gt 0) {
            Write-Warning ('Uno de los procesos principales se detuvo: ' + ($stopped -join ', '))
            if ($vite.HasExited) { Tail-Log $viteErr; Tail-Log $viteOut }
            if ($bridge.HasExited) { Tail-Log $bridgeErr; Tail-Log $bridgeOut }
            if ($cloud.HasExited) { Tail-Log $cloudErr; Tail-Log $cloudOut }
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
