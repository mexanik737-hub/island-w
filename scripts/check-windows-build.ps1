[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$logDirectory = Join-Path $PSScriptRoot '../ci-logs'
New-Item -ItemType Directory -Force $logDirectory | Out-Null
Start-Transcript -Path (Join-Path $logDirectory 'windows-environment.log') -Force | Out-Null
try {
    Write-Output "OS: $([Environment]::OSVersion.VersionString)"
    Write-Output "Architecture: $([Runtime.InteropServices.RuntimeInformation]::OSArchitecture)"
    foreach ($tool in @('rustc', 'cargo', 'cl.exe', 'link.exe', 'rc.exe')) {
        $resolved = Get-Command $tool -ErrorAction SilentlyContinue
        if (-not $resolved) {
            if ($tool -in @('rustc', 'cargo')) { throw "Missing $tool. Install stable Rust for x86_64-pc-windows-msvc and add Cargo's bin directory to PATH." }
            throw "Missing $tool. Install Visual Studio C++ Build Tools with Desktop development with C++ and Windows SDK, then use Developer PowerShell for x64."
        }
        Write-Output "$tool`: $($resolved.Source)"
    }
    rustc --version --verbose
    if ($LASTEXITCODE -ne 0) { throw 'rustc version check failed.' }
    cargo --version
    if ($LASTEXITCODE -ne 0) { throw 'cargo version check failed.' }
    if (-not $env:WindowsSdkDir -or -not $env:WindowsSDKVersion) {
        throw 'Windows SDK environment is missing. Install the Windows 10/11 SDK and open Developer PowerShell for x64.'
    }
    $sdkVersion = $env:WindowsSDKVersion.TrimEnd('\')
    foreach ($library in @("Lib/$sdkVersion/um/x64/kernel32.lib", "Lib/$sdkVersion/ucrt/x64/ucrt.lib")) {
        $libraryPath = Join-Path $env:WindowsSdkDir $library
        if (-not (Test-Path -LiteralPath $libraryPath)) { throw "Missing Windows SDK library: $libraryPath" }
        Write-Output "SDK library: $libraryPath"
    }
    Write-Output 'MSVC and Windows SDK preflight passed. This does not test the WebView2 runtime or application launch.'
} finally {
    Stop-Transcript | Out-Null
}
