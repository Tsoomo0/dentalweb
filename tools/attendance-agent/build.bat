@echo off
REM Builds attendance-agent.exe and a ready-to-copy folder: dist\attendance-agent\
REM (exe + installer + README). Keep this file ASCII-only: cmd misreads UTF-8 batch files.
cd /d "%~dp0"
python -m pip install -r requirements.txt || exit /b 1
python -m PyInstaller --onefile --noconsole --clean --name attendance-agent --distpath build\exe --workpath build\work --specpath build agent.py || exit /b 1

if exist dist\attendance-agent rmdir /s /q dist\attendance-agent
mkdir dist\attendance-agent
copy /y build\exe\attendance-agent.exe dist\attendance-agent\ >nul
copy /y install-task.bat dist\attendance-agent\ >nul
copy /y install.ps1 dist\attendance-agent\ >nul
copy /y uninstall-task.bat dist\attendance-agent\ >nul
copy /y README.txt dist\attendance-agent\ >nul

echo.
echo Ready: %~dp0dist\attendance-agent\
