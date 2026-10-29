Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
ScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Set working directory to project folder
WshShell.CurrentDirectory = ScriptDir

' Run the backend server silently in the background (0 = hidden window)
' The server automatically mounts SQLite and opens Google Chrome to http://localhost:5050
WshShell.Run "node backend/server.js", 0, False

