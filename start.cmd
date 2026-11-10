@echo off
cd /d "%~dp0"
set "ABS_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%ABS_NODE%" (
  "%ABS_NODE%" server.mjs --open
) else (
  node server.mjs --open
)
pause
