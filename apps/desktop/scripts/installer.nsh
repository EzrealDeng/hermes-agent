!include "LogicLib.nsh"
!include "WinMessages.nsh"

!macro BroadcastEnvironmentChange
  System::Call 'USER32::SendMessageTimeoutW(p ${HWND_BROADCAST}, i ${WM_SETTINGCHANGE}, p 0, w "Environment", i 0x0002, i 5000, *p .r0)'
!macroend

!macro RemoveHermesCliPath INPUT OUTPUT
  Push $4
  Push $5
  Push $6
  StrCpy ${OUTPUT} ""
  StrCpy $4 ${INPUT}

  remove_loop:
    StrCmp $4 "" remove_done
    StrCpy $5 0

  find_separator:
    StrCpy $6 $4 1 $5
    StrCmp $6 "" last_entry
    StrCmp $6 ";" entry_found
    IntOp $5 $5 + 1
    Goto find_separator

  entry_found:
    StrCpy $6 $4 $5
    IntOp $5 $5 + 1
    StrCpy $4 $4 "" $5
    Goto compare_entry

  last_entry:
    StrCpy $6 $4
    StrCpy $4 ""

  compare_entry:
    StrCmp $6 "$INSTDIR\cli-bin" remove_loop
    StrCmp $6 "" remove_loop
    StrCmp ${OUTPUT} "" 0 append_separator
    StrCpy ${OUTPUT} $6
    Goto remove_loop

  append_separator:
    StrCpy ${OUTPUT} "${OUTPUT};$6"
    Goto remove_loop

  remove_done:
    Pop $6
    Pop $5
    Pop $4
!macroend

!macro customInstall
  CreateDirectory "$INSTDIR\cli-bin"

  FileOpen $0 "$INSTDIR\cli-bin\hermes.cmd" w
  FileWrite $0 "@echo off$\r$\n"
  FileWrite $0 "setlocal$\r$\n"
  FileWrite $0 'set "HERMES_HOME=%APPDATA%\Hermes Bundled\hermes-home"$\r$\n'
  FileWrite $0 'set "PYTHONPATH=%~dp0..\resources\hermes-runtime\venv\Lib\site-packages"$\r$\n'
  FileWrite $0 '"%~dp0..\resources\hermes-runtime\python\python.exe" -m hermes_cli.main %*$\r$\n'
  FileWrite $0 "exit /b %ERRORLEVEL%$\r$\n"
  FileClose $0

  StrCpy $1 "$INSTDIR\cli-bin"
  StrCpy $2 ""
  ReadRegStr $2 HKCU "Environment" "Path"
  !insertmacro RemoveHermesCliPath "$2" $3
  ${If} $3 == ""
    WriteRegExpandStr HKCU "Environment" "Path" "$1"
  ${Else}
    WriteRegExpandStr HKCU "Environment" "Path" "$1;$3"
  ${EndIf}

  !insertmacro BroadcastEnvironmentChange
!macroend

!macro customUnInstall
  StrCpy $2 ""
  ReadRegStr $2 HKCU "Environment" "Path"
  !insertmacro RemoveHermesCliPath "$2" $3
  ${If} $3 != $2
    WriteRegExpandStr HKCU "Environment" "Path" "$3"
    !insertmacro BroadcastEnvironmentChange
  ${EndIf}
!macroend
