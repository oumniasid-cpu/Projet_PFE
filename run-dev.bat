@echo off
start "BuildTrack Backend" /D "%~dp0backend" cmd /k "npm.cmd run dev"
start "BuildTrack Frontend" /D "%~dp0frontend" cmd /k "npm.cmd run dev"
