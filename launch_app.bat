@echo off
echo Starting MyCrowd application...
cd %~dp0dist
echo Current directory: %CD%
echo Files in current directory:
dir
echo.
echo Checking for templates directory:
if exist templates (
    echo Templates directory found
    dir templates
) else (
    echo Templates directory NOT found
)
echo.
echo Starting app with console output:
app.exe
echo.
echo If the application crashed, check the error messages above.
pause
