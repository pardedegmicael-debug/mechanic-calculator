@echo off
setlocal
pushd "%~dp0"

set "GXX=%LOCALAPPDATA%\Programs\MSYS2\ucrt64\bin\g++.exe"
set "MSYS_BIN=%LOCALAPPDATA%\Programs\MSYS2\ucrt64\bin"
if exist "%MSYS_BIN%\g++.exe" set "PATH=%MSYS_BIN%;%PATH%"
if not exist "%GXX%" set "GXX=g++"
if not exist build mkdir build
if exist "%GXX%" (
    "%GXX%" -std=c++17 -Wall -Wextra -Wpedantic -static -static-libgcc -static-libstdc++ -Isrc src\main.cpp -o build\simulasi.exe
) else (
    where g++ >nul 2>nul
    if errorlevel 1 (
        echo C++17 compiler tidak ditemukan.
        echo Instal GCC melalui MSYS2 dengan: pacman -S mingw-w64-ucrt-x86_64-gcc
        popd
        exit /b 1
    )
    g++ -std=c++17 -Wall -Wextra -Wpedantic -static -static-libgcc -static-libstdc++ -Isrc src\main.cpp -o build\simulasi.exe
)
if errorlevel 1 (
    popd
    exit /b 1
)

echo Build berhasil. Menjalankan build\simulasi.exe
build\simulasi.exe
popd
