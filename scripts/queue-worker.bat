@echo off
REM Lab training болон мэдэгдлийн дараалал боловсруулах worker.
REM Windows Task Scheduler-ээс систем асах бүрд ажиллана.
cd /d C:\Users\Flawless\dentalweb
:loop
"C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" artisan queue:work --tries=1 --timeout=300 --sleep=3 --max-time=3600
timeout /t 5 /nobreak >nul
goto loop
