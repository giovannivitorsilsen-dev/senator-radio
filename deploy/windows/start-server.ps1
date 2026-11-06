$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot "../.."))
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 18+ non trovato. Installa Node.js prima di procedere."
}
if (-not (Test-Path "node_modules/ws")) { npm install }
$env:PORT = if ($env:PORT) { $env:PORT } else { "3000" }
npm start
