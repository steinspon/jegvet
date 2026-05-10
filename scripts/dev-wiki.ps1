param(
  [string]$ContentDir = "wiki/content",
  [string]$OutputPath = "wiki/data/content-manifest.json",
  [string]$FallbackOutputPath = "wiki/data/wiki-fallback.js"
)

$rebuildScript = Join-Path (Split-Path -Parent $PSCommandPath) "rebuild-wiki-manifest.ps1"
$watchScript = Join-Path (Split-Path -Parent $PSCommandPath) "watch-wiki-manifest.ps1"

powershell -ExecutionPolicy Bypass -File $rebuildScript -ContentDir $ContentDir -OutputPath $OutputPath -FallbackOutputPath $FallbackOutputPath
powershell -ExecutionPolicy Bypass -File $watchScript -ContentDir $ContentDir -OutputPath $OutputPath
