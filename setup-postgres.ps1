# setup-postgres.ps1
$ErrorActionPreference = "Stop"

$zipPath = "D:\pgsql.zip"
$extractPath = "D:\pgsql"
$url = "https://get.enterprisedb.com/postgresql/postgresql-16.15-3-windows-x64-binaries.zip"

if (-not (Test-Path "D:\pgsql\bin\initdb.exe") -and -not (Test-Path "D:\pgsql\pgsql\bin\initdb.exe")) {
    if (-not (Test-Path $zipPath)) {
        Write-Host "Downloading PostgreSQL portable zip..."
        curl.exe -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -o $zipPath $url
        if ($LASTEXITCODE -ne 0) { throw "Download failed!" }
    }

    Write-Host "Extracting PostgreSQL..."
    Expand-Archive -Path $zipPath -DestinationPath "D:\pgsql_tmp" -Force
    if (Test-Path "D:\pgsql_tmp\pgsql") {
        Move-Item -Path "D:\pgsql_tmp\pgsql" -Destination "D:\pgsql" -Force
        Remove-Item -Path "D:\pgsql_tmp" -Recurse -Force
    } else {
        Move-Item -Path "D:\pgsql_tmp" -Destination "D:\pgsql" -Force
    }
    Remove-Item -Path $zipPath -Force
}

$binDir = "D:\pgsql\bin"
if (-not (Test-Path "$binDir\initdb.exe")) {
    $binDir = "D:\pgsql\pgsql\bin"
}
Write-Host "PostgreSQL bin dir: $binDir"

$dataDir = "D:\pgsql\data"
if (-not (Test-Path "$dataDir\PG_VERSION")) {
    Write-Host "Initializing PostgreSQL database cluster..."
    & "$binDir\initdb.exe" -D $dataDir -U postgres -E UTF8 --locale=C -A trust
}

Write-Host "Starting PostgreSQL server..."
& "$binDir\pg_ctl.exe" -D $dataDir -l "D:\pgsql\logfile.txt" start

Start-Sleep -Seconds 3

Write-Host "Configuring users and databases..."
& "$binDir\psql.exe" -U postgres -c "DO 'BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = ''case_admin'') THEN CREATE ROLE case_admin WITH LOGIN SUPERUSER PASSWORD ''change_me_locally''; END IF; END';"
& "$binDir\psql.exe" -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'case_tracking'" | Out-Null
& "$binDir\psql.exe" -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'case_tracking'" | ForEach-Object { $_.Trim() } | Tee-Object -Variable dbExists

if ($dbExists -ne "1") {
    & "$binDir\psql.exe" -U postgres -c "CREATE DATABASE case_tracking OWNER case_admin;"
}

Write-Host "PostgreSQL is ready!"
