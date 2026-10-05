@echo off
REM Removes the agent from Task Scheduler. The folder can be deleted afterwards.
schtasks /Delete /F /TN "DentaSuite Attendance Agent"
echo.
pause
