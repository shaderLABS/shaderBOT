for /F "tokens=3 delims=: " %%H in ('sc query "postgresql-x64-13" ^| findstr "        STATE"') do (
  if /I "%%H" NEQ "RUNNING" (
    @echo off
    if not "%1"=="am_admin" (powershell start -verb runas '%0' am_admin & exit /b)
    net start postgresql-x64-13
  )
)