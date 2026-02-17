$proj = "C:\VT\DreamARC"
$fe   = Join-Path $proj "frontend"
Set-Location $fe

Write-Host "0) Check Node/NPM..." -ForegroundColor Cyan
node -v
npm -v

Write-Host "1) Kill lockers..." -ForegroundColor Cyan
Get-Process node, esbuild, vite -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process Code -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "2) Remove node_modules..." -ForegroundColor Cyan
if (Test-Path ".\node_modules") {
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $tmp = ".\node_modules__DELETE__$stamp"
  try { Rename-Item ".\node_modules" $tmp -ErrorAction Stop } catch {}
  if (Test-Path $tmp) { cmd /c "rmdir /s /q `"$pwd\$tmp`"" | Out-Null }
}

Remove-Item -Force -ErrorAction SilentlyContinue ".\package-lock.json"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue ".\dist"

Write-Host "3) npm cache..." -ForegroundColor Cyan
npm cache clean --force | Out-Null

Write-Host "4) npm install..." -ForegroundColor Cyan
npm install

Write-Host "5) build..." -ForegroundColor Cyan
npx vite --version
npm run build
