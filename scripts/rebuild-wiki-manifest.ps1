param(
  [string]$ContentDir = "wiki/content",
  [string]$OutputPath = "wiki/data/content-manifest.json",
  [string]$FallbackOutputPath = "wiki/data/wiki-fallback.js"
)

$root = Resolve-Path $ContentDir
$rootPath = $root.Path

$files = Get-ChildItem -Path $rootPath -Recurse -File -Filter *.md |
  Sort-Object FullName

$pages = @()
$contents = [ordered]@{}

foreach ($file in $files) {
  $relative = $file.FullName.Substring($rootPath.Length).TrimStart('\\') -replace '\\','/'
  $lines = Get-Content -LiteralPath $file.FullName
  $rawContent = [System.IO.File]::ReadAllText($file.FullName)
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

  $contents[$relative] = $rawContent
}

$manifest = [PSCustomObject]@{
  title = "Veterinary Reference Wiki"
  generatedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
  pages = $pages
}

$manifestJson = $manifest | ConvertTo-Json -Depth 6
$manifestJson | Set-Content -LiteralPath $OutputPath -Encoding UTF8

$fallbackLines = @()
$fallbackLines += "window.WIKI_FALLBACK = {"
$fallbackLines += "  manifest: $manifestJson,"
$fallbackLines += "  pages: {"

$keys = @($contents.Keys)
for ($i = 0; $i -lt $keys.Count; $i++) {
  $key = $keys[$i]
  $valueJson = $contents[$key] | ConvertTo-Json -Compress
  $comma = if ($i -lt $keys.Count - 1) { "," } else { "" }
  $escapedKey = [System.Management.Automation.Language.CodeGeneration]::EscapeSingleQuotedStringContent($key)
  $fallbackLines += "    '$escapedKey': $valueJson$comma"
}

$fallbackLines += "  }"
$fallbackLines += "};"

$fallbackLines -join "`r`n" | Set-Content -LiteralPath $FallbackOutputPath -Encoding UTF8

Write-Host "Wrote $OutputPath with $($pages.Count) pages"
Write-Host "Wrote $FallbackOutputPath"
