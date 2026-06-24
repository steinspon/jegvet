param(
  [string]$ContentDir = "wiki/content",
  [string]$OutputPath = "wiki/data/content-manifest.json",
  [string]$FallbackOutputPath = "wiki/data/wiki-fallback.js"
)

$root = Resolve-Path $ContentDir
$rootPath = $root.Path
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-Utf8Text {
  param(
    [string]$Path
  )

  $reader = New-Object System.IO.StreamReader($Path, [System.Text.Encoding]::UTF8, $true)
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
}

function Write-Utf8TextNoBom {
  param(
    [string]$Path,
    [string]$Content
  )

  [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

$files = Get-ChildItem -Path $rootPath -Recurse -File -Filter *.md |
  Sort-Object FullName

$pages = @()
$contents = [ordered]@{}

foreach ($file in $files) {
  $relative = $file.FullName.Substring($rootPath.Length).TrimStart('\') -replace '\\','/'
  $rawContent = Read-Utf8Text -Path $file.FullName
  $lines = $rawContent -replace "`r","" -split "`n"
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
Write-Utf8TextNoBom -Path $OutputPath -Content $manifestJson

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

Write-Utf8TextNoBom -Path $FallbackOutputPath -Content ($fallbackLines -join "`r`n")

Write-Host "Wrote $OutputPath with $($pages.Count) pages"
Write-Host "Wrote $FallbackOutputPath"
