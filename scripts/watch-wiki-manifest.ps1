param(
  [string]$ContentDir = "wiki/content",
  [string]$OutputPath = "wiki/data/content-manifest.json"
)

$scriptPath = Join-Path (Split-Path -Parent $PSCommandPath) "rebuild-wiki-manifest.ps1"
$fullContentPath = (Resolve-Path $ContentDir).Path

Write-Host "Watching $fullContentPath for changes..."
Write-Host "Press Ctrl+C to stop."

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $fullContentPath
$watcher.Filter = "*.md"
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, DirectoryName, LastWrite'
$watcher.EnableRaisingEvents = $true

$action = {
  param($sender, $eventArgs)
  try {
    Start-Sleep -Milliseconds 250
    powershell -ExecutionPolicy Bypass -File $using:scriptPath -ContentDir $using:ContentDir -OutputPath $using:OutputPath | Out-Null
    Write-Host "[$(Get-Date -Format HH:mm:ss)] Manifest rebuilt after $($eventArgs.ChangeType): $($eventArgs.FullPath)"
  } catch {
    Write-Warning "Manifest rebuild failed: $_"
  }
}

$subs = @(
  Register-ObjectEvent $watcher Changed -Action $action,
  Register-ObjectEvent $watcher Created -Action $action,
  Register-ObjectEvent $watcher Deleted -Action $action,
  Register-ObjectEvent $watcher Renamed -Action $action
)

try {
  while ($true) {
    Wait-Event -Timeout 1 | Out-Null
  }
} finally {
  $subs | ForEach-Object { Unregister-Event -SourceIdentifier $_.Name }
  $watcher.Dispose()
}
