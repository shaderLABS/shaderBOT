for /F "tokens=3 delims=: " %%H in ('sc query "postgresql-x64-14" ^| findstr "        STATE"') do (
  if /I "%%H" EQU "RUNNING" (
    @echo off
    if not "%1"=="am_admin" (powershell start -verb runas '%0' am_admin & exit /b)
    net stop postgresql-x64-14
  )
)