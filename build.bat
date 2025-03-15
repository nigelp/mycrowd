@echo off
echo Building MyCrowd application with PyInstaller...

REM Clean previous builds
rmdir /s /q build
rmdir /s /q dist

REM Create a one-folder build with explicit template and static inclusion
pyinstaller --noconfirm ^
  --onedir ^
  --add-data "templates;templates" ^
  --add-data "static;static" ^
  --add-data "anon_settings.json;." ^
  --add-data "model_settings.json;." ^
  --add-data "system_prompt.json;." ^
  --hidden-import flask ^
  --hidden-import jinja2 ^
  --hidden-import jinja2.ext ^
  app.py

echo Build complete! Check the dist folder for the executable.

REM Create a launcher batch file in the dist folder
echo @echo off > dist\app\run_mycrowd.bat
echo cd /d %%~dp0 >> dist\app\run_mycrowd.bat
echo app.exe >> dist\app\run_mycrowd.bat
echo pause >> dist\app\run_mycrowd.bat

echo Launcher script created at dist\app\run_mycrowd.bat
