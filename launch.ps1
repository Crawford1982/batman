$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$gameAddress = 'http://localhost:4173'
try { $gameResponse = Invoke-WebRequest -Uri $gameAddress -TimeoutSec 2 -UseBasicParsing } catch { $gameResponse = $null }
if (-not $gameResponse) {
  Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList @('node_modules/vite/bin/vite.js','--host','0.0.0.0','--port','4173') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
  for ($attempt=0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 300
    try { $gameResponse = Invoke-WebRequest -Uri $gameAddress -TimeoutSec 1 -UseBasicParsing; break } catch {}
  }
}
if (-not $gameResponse) { throw 'The game server did not start. Run npm run dev in this folder.' }
Start-Process $gameAddress
