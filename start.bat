@echo off
echo Starting MyCrowd...
echo.

echo Checking if Ollama is running...
curl -s http://localhost:11434/api/tags > nul
if %errorlevel% neq 0 (
  echo.
  echo ERROR: Ollama is not running!
  echo Please start Ollama before running MyCrowd.
  echo.
  echo You can download Ollama from: https://ollama.ai/download
  echo.
  pause
  exit /b 1
)

echo Ollama is running! Starting MyCrowd...
echo.
python app.py