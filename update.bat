@echo off
:: 設定編碼為 UTF-8 以顯示中文
chcp 65001 >nul
cls
setlocal EnableExtensions EnableDelayedExpansion

echo ==========================================
echo       GitHub 自動上傳腳本 (Auto Push)
echo ==========================================
echo.

:: 0. 先切到這個 bat 所在資料夾
cd /d "%~dp0"

:: 0-1. 自動向上尋找 .git，定位 repo 根目錄
set "ROOT=%cd%"
:find_git
if exist "%ROOT%\.git\" goto FoundGit
for %%I in ("%ROOT%") do set "PARENT=%%~dpI"
if "%PARENT:~-1%"=="\" set "PARENT=%PARENT:~0,-1%"
if /i "%PARENT%"=="%ROOT%" goto NotGitRepo
set "ROOT=%PARENT%"
goto find_git

:NotGitRepo
echo [錯誤] 找不到 Git 倉庫 (.git)！
echo 目前位置: "%cd%"
echo 請確認 update.bat 放在 Git 專案資料夾內（或其子資料夾）。
echo.
goto End

:FoundGit
cd /d "%ROOT%"
echo [資訊] 已切換至 Repo 根目錄: "%cd%"
echo.

:: 1. 檢查是否有安裝 Git
where git >nul 2>nul
if %errorlevel% neq 0 goto NoGit

:: 2. 顯示目前的狀態（先用簡短模式判斷有無變更）
echo [狀態] 正在檢查變更檔案...
git status
echo.

for /f "delims=" %%A in ('git status --porcelain') do set "HAS_CHANGES=1"
if not defined HAS_CHANGES (
  echo [提示] 沒有任何變更可提交，結束。
  goto End
)

:: 3. 讓使用者輸入 Commit 訊息
set "commit_msg="
set /p commit_msg="請輸入 Commit 訊息 (直接按 Enter 則預設為 'Update'): "
if "%commit_msg%"=="" set "commit_msg=Update"

:: 4. 執行 Git 流程
echo.
echo [1/3] 加入所有檔案 (git add .)
git add .

echo [2/3] 提交變更 (git commit)
git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
  echo [提示] 可能沒有新變更可提交（或 commit 失敗），將繼續嘗試 push...
)

echo [3/3] 推送到遠端 (git push)
:: 嘗試直接推送
git push
if %errorlevel% equ 0 goto Success

:: 如果直接推送失敗，嘗試設定上游分支 (針對第一次上傳)
echo.
echo [注意] 直接推送失敗，嘗試設定上游分支 (git push -u origin main)...
git push -u origin main
if %errorlevel% equ 0 goto Success

echo.
echo [注意] main 推送失敗，嘗試 master 分支...
git push -u origin master
if %errorlevel% equ 0 goto Success

:: 如果都失敗
goto Error

:Success
echo.
echo ==========================================
echo [成功] 檔案已成功上傳至 GitHub！
echo ==========================================
goto End

:Error
echo.
echo ==========================================
echo [失敗] 上傳過程發生錯誤。
echo 請檢查：
echo 1. 網路是否連線
echo 2. 是否已設定遠端倉庫 (git remote add origin ...)
echo 3. 是否有權限 (可能需要登入 GitHub)
echo 4. 目前 Repo 根目錄: "%cd%"
echo ==========================================
goto End

:NoGit
echo.
echo [錯誤] 找不到 Git 指令！
echo 請確認您已安裝 Git (https://git-scm.com/) 並設定好環境變數。

:End
echo.
echo 請按任意鍵關閉視窗...
pause >nul
endlocal
