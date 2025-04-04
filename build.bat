@echo off
echo Building MyCrowd application with PyInstaller...

REM Clean previous builds
rmdir /s /q build
rmdir /s /q dist

REM Install required packages if not already installed
pip install -r requirements.txt

REM Create a one-file build with all dependencies bundled
pyinstaller --noconfirm ^
  --onefile ^
  --add-data "templates;templates" ^
  --add-data "static;static" ^
  --add-data "anon_settings.json;." ^
  --add-data "model_settings.json;." ^
  --add-data "system_prompt.json;." ^
  --hidden-import flask ^
  --hidden-import jinja2 ^
  --hidden-import werkzeug ^
  --hidden-import requests ^
  --hidden-import json ^
  --hidden-import random ^
  --hidden-import datetime ^
  --hidden-import webbrowser ^
  --name MyCrowd ^
  app.py

echo Build complete! Check the dist folder for the executable.

REM Create a complete distribution package with all necessary files
echo Creating complete distribution package...

REM Create distribution directory structure
mkdir dist\MyCrowd
mkdir dist\MyCrowd\templates
mkdir dist\MyCrowd\static
mkdir dist\MyCrowd\static\avatars

REM Copy executable
copy dist\MyCrowd.exe dist\MyCrowd\

REM Copy all template files
xcopy /E /I /Y templates dist\MyCrowd\templates

REM Copy all static files
xcopy /E /I /Y static dist\MyCrowd\static

REM Copy configuration files
copy anon_settings.json dist\MyCrowd\
copy model_settings.json dist\MyCrowd\
copy system_prompt.json dist\MyCrowd\

REM Create a README file with instructions
echo Creating README file...
echo MyCrowd - Social Media Simulation with AI > dist\MyCrowd\README.txt
echo. >> dist\MyCrowd\README.txt
echo REQUIREMENTS: >> dist\MyCrowd\README.txt
echo 1. Ollama must be installed and running on the system >> dist\MyCrowd\README.txt
echo    Download from: https://ollama.ai/download >> dist\MyCrowd\README.txt
echo. >> dist\MyCrowd\README.txt
echo INSTRUCTIONS: >> dist\MyCrowd\README.txt
echo 1. Install Ollama from the link above >> dist\MyCrowd\README.txt
echo 2. Run Ollama >> dist\MyCrowd\README.txt
echo 3. Run the included "run_mycrowd.bat" file to start the application >> dist\MyCrowd\README.txt
echo 4. The application will open in your default web browser >> dist\MyCrowd\README.txt
echo. >> dist\MyCrowd\README.txt
echo NOTE: This application requires Ollama to be running for AI responses. >> dist\MyCrowd\README.txt

REM Create launcher batch file
echo Creating launcher batch file...
echo @echo off > dist\MyCrowd\run_mycrowd.bat
echo echo Starting MyCrowd... >> dist\MyCrowd\run_mycrowd.bat
echo echo. >> dist\MyCrowd\run_mycrowd.bat
echo echo Checking if Ollama is running... >> dist\MyCrowd\run_mycrowd.bat
echo curl -s http://localhost:11434/api/tags ^> nul >> dist\MyCrowd\run_mycrowd.bat
echo if %%errorlevel%% neq 0 ( >> dist\MyCrowd\run_mycrowd.bat
echo   echo. >> dist\MyCrowd\run_mycrowd.bat
echo   echo ERROR: Ollama is not running! >> dist\MyCrowd\run_mycrowd.bat
echo   echo Please start Ollama before running MyCrowd. >> dist\MyCrowd\run_mycrowd.bat
echo   echo. >> dist\MyCrowd\run_mycrowd.bat
echo   echo You can download Ollama from: https://ollama.ai/download >> dist\MyCrowd\run_mycrowd.bat
echo   echo. >> dist\MyCrowd\run_mycrowd.bat
echo   pause >> dist\MyCrowd\run_mycrowd.bat
echo   exit /b 1 >> dist\MyCrowd\run_mycrowd.bat
echo ) >> dist\MyCrowd\run_mycrowd.bat
echo echo Ollama is running! Starting MyCrowd... >> dist\MyCrowd\run_mycrowd.bat
echo echo. >> dist\MyCrowd\run_mycrowd.bat
echo cd /d "%%~dp0" >> dist\MyCrowd\run_mycrowd.bat
echo start "" "MyCrowd.exe" >> dist\MyCrowd\run_mycrowd.bat

REM Create distribution zip file
echo Creating distribution zip file...
cd dist
powershell -Command "Compress-Archive -Path MyCrowd -DestinationPath MyCrowd_Complete.zip -Force"
cd ..

echo.
echo Build process complete!
echo.
echo Distribution package is available at: dist\MyCrowd_Complete.zip
echo.
echo NOTE: Users will still need to install Ollama separately.
echo.