[CmdletBinding()]
param(
    [string]$BundleDirectory = (Join-Path $PSScriptRoot '../src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis'),
    [string]$ExecutablePath = (Join-Path $PSScriptRoot '../src-tauri/target/x86_64-pc-windows-msvc/release/island-w.exe')
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
$executable = Get-Item -LiteralPath $ExecutablePath -ErrorAction Stop
if ($executable.Length -lt 1024) { throw 'Application executable is unexpectedly small.' }
$stream = [IO.File]::OpenRead($executable.FullName)
try {
    if ($stream.ReadByte() -ne 0x4D -or $stream.ReadByte() -ne 0x5A) {
        throw 'Application has no Windows executable header.'
    }
} finally { $stream.Dispose() }
$imageBytes = [IO.File]::ReadAllBytes($executable.FullName)
$peOffset = [BitConverter]::ToInt32($imageBytes, 0x3c)
if ($peOffset -lt 0 -or $peOffset + 24 + 70 -gt $imageBytes.Length) {
    throw 'Application has an invalid PE header offset.'
}
if ([BitConverter]::ToUInt32($imageBytes, $peOffset) -ne 0x00004550 -or
    [BitConverter]::ToUInt16($imageBytes, $peOffset + 4) -ne 0x8664) {
    throw 'Application must be a Windows x64 PE executable.'
}
if ([BitConverter]::ToUInt16($imageBytes, $peOffset + 24 + 68) -ne 2) {
    throw 'Application must use the Windows GUI subsystem, not a console window.'
}
$logDirectory = Join-Path $PSScriptRoot '../ci-logs'
New-Item -ItemType Directory -Force $logDirectory | Out-Null
$checksums = foreach ($file in @($installer, $executable)) {
    $hash = Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256
    "$($hash.Hash.ToLowerInvariant())  $($file.Name)"
}
$checksums | Set-Content -LiteralPath (Join-Path $logDirectory 'SHA256SUMS.txt') -Encoding ascii
Write-Output "Verified installer file: $($installer.Name) ($($installer.Length) bytes)"
Write-Output 'File checks do not prove installation or Windows 11 launch. This CI artifact is unsigned.'
