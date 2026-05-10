param(
  [string]$ContentDir = "wiki/content",
  [string]$OutputPath = "wiki/data/content-manifest.json"
)

$root = Resolve-Path $ContentDir
$rootPath = $root.Path

$files = Get-ChildItem -Path $rootPath -Recurse -File -Filter *.md |
  Sort-Object FullName

$pages = @()

foreach ($file in $files) {
  $relative = $file.FullName.Substring($rootPath.Length).TrimStart('\\') -replace '\\','/'
  $lines = Get-Content -LiteralPath $file.FullName
  $titleLine = $lines | Where-Object { $_ -match '^#\s+.+$' } | Select-Object -First 1

  if ($titleLine) {
    $title = ($titleLine -replace '^#\s+','').Trim()
  } else {
    $title = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
  }

  $folder = [System.IO.Path]::GetDirectoryName($relative)
  if ([string]::IsNullOrWhiteSpace($folder)) {
    $folder = "General"
  } else {
    $folder = ($folder -replace '\\','/')
  }

  $pages += [PSCustomObject]@{
    file = $relative
    title = $title
    folder = $folder
  }
}

$manifest = [PSCustomObject]@{
  title = "Veterinary Reference Wiki"
  generatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
  pages = $pages
}

$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Host "Wrote $OutputPath with $($pages.Count) pages"
