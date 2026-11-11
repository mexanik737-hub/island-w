[CmdletBinding()]
param(
    [string]$BundleDirectory = (Join-Path $PSScriptRoot '../src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis')
)

$ErrorActionPreference = 'Stop'
$installers = @(Get-ChildItem -LiteralPath $BundleDirectory -Filter '*-setup.exe' -File)
if ($installers.Count -ne 1) { throw "Expected exactly one NSIS installer, found $($installers.Count)." }
$installer = $installers[0]
if ($installer.Length -lt 1024) { throw 'Installer is unexpectedly small.' }
$stream = [IO.File]::OpenRead($installer.FullName)
try {
    if ($stream.ReadByte() -ne 0x4D -or $stream.ReadByte() -ne 0x5A) {
        throw 'Installer has no Windows executable header.'
    }
} finally { $stream.Dispose() }
$hash = Get-FileHash -LiteralPath $installer.FullName -Algorithm SHA256
$logDirectory = Join-Path $PSScriptRoot '../ci-logs'
New-Item -ItemType Directory -Force $logDirectory | Out-Null
"$($hash.Hash.ToLowerInvariant())  $($installer.Name)" | Set-Content -LiteralPath (Join-Path $logDirectory 'SHA256SUMS.txt') -Encoding ascii
Write-Output "Verified installer file: $($installer.Name) ($($installer.Length) bytes)"
Write-Output 'File checks do not prove installation or Windows 11 launch. This CI artifact is unsigned.'
