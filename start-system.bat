@echo off
chcp 65001 >nul
title منظومة تتبع قضايا المسؤولية الطبية
echo ========================================================
echo   تشغيل منظومة تتبع قضايا المسؤولية الطبية
echo ========================================================
echo.

echo [1/2] التحقق من خادم قاعدة البيانات PostgreSQL...
tasklist /fi "imagename eq postgres.exe" | findstr /i "postgres.exe" >nul
if errorlevel 1 (
    echo       تشغيل خادم PostgreSQL...
    "D:\pgsql\bin\pg_ctl.exe" -D "D:\pgsql\data" -l "D:\pgsql\logfile.txt" start
    timeout /t 2 /nobreak >nul
) else (
    echo       قاعدة البيانات تعمل بنجاح.
)

echo.
echo [2/2] تشغيل خادم المنظومة (Next.js)...
echo       الرابط المحلي: http://localhost:3000
echo ========================================================
echo.

cd /d "%~dp0"
npm run dev
