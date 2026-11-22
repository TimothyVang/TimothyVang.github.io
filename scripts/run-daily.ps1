# Daily job, run by Windows Task Scheduler: pull, scan sources, let omp judge and update, push.
$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
New-Item -ItemType Directory -Force (Join-Path $repo 'state\logs') | Out-Null
$log = Join-Path $repo ("state\logs\" + (Get-Date -Format 'yyyy-MM-dd') + '.log')
Start-Transcript -Path $log -Append | Out-Null

$bun = 'C:\Users\newbi\.bun\bin\bun.exe'
$omp = 'C:\Users\newbi\AppData\Local\omp\omp.exe'
if (-not (Test-Path $omp)) { $omp = (Get-Command omp -ErrorAction SilentlyContinue).Source }

git pull --rebase --autostash
$env:GH_TOKEN = (gh auth token)

& $bun scripts/scan.mjs
& $omp -p --no-session --cwd $repo "@omp/update-standards.md" "Today is $(Get-Date -Format 'yyyy-MM-dd'). Run the daily update now."

# Safety net: never leave invalid data pushed.
& $bun scripts/validate.mjs
if ($LASTEXITCODE -ne 0) { Write-Output 'validate failed after omp run; reverting data file'; git checkout -- data/standards.json }

Stop-Transcript | Out-Null
