@echo off
echo Building MyCrowd application with PyInstaller...
pyinstaller --clean --noconfirm app.spec
echo Build complete! Check the dist folder for the executable.