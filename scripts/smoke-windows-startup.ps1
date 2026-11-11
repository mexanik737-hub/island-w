[CmdletBinding()]
param(
    [string]$ExecutablePath = (Join-Path $PSScriptRoot '../src-tauri/target/x86_64-pc-windows-msvc/release/island-w.exe'),
    [ValidateRange(1, 60)][int]$Seconds = 10
)

$ErrorActionPreference = 'Stop'
$executable = (Resolve-Path -LiteralPath $ExecutablePath).Path
$logDirectory = Join-Path $PSScriptRoot '../ci-logs'
New-Item -ItemType Directory -Force $logDirectory | Out-Null
$stdout = Join-Path $logDirectory 'startup.stdout.log'
$stderr = Join-Path $logDirectory 'startup.stderr.log'
$appProcess = Start-Process -FilePath $executable -WorkingDirectory (Split-Path $executable) -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
try {
    if ($appProcess.WaitForExit($Seconds * 1000)) {
        $detail = Get-Content -LiteralPath $stderr -Raw -ErrorAction SilentlyContinue
        throw "Island-W exited during startup with code $($appProcess.ExitCode). $detail"
    }
    $startupLog = @(
        Get-Content -LiteralPath $stdout -Raw -ErrorAction SilentlyContinue
        Get-Content -LiteralPath $stderr -Raw -ErrorAction SilentlyContinue
    ) -join "`n"
    if ($startupLog -match '(?im)panic:|panicked at|error while running Island|interface:') {
        throw "Island-W reported a startup panic or frontend exception. $startupLog"
    }
    Write-Output "Island-W stayed alive for $Seconds seconds. This checks early startup, not visible UI or hardware behavior."
} finally {
    if (-not $appProcess.HasExited) { Stop-Process -Id $appProcess.Id -Force }
    $appProcess.Dispose()
}
