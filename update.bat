@echo off
:: 設定編碼為 UTF-8 以顯示中文
chcp 65001
cls

echo ==========================================
echo       GitHub 自動上傳腳本 (Auto Push)
echo ==========================================
echo.

:: 1. 檢查是否有安裝 Git
where git >nul 2>nul
if %errorlevel% neq 0 goto NoGit

:: 2. 顯示目前的狀態
echo [狀態] 正在檢查變更檔案...
git status
echo.

:: 3. 讓使用者輸入 Commit 訊息
set "commit_msg="
set /p commit_msg="請輸入 Commit 訊息 (直接按 Enter 則預設為 'Update'): "
if "%commit_msg%"=="" set commit_msg=Update

:: 4. 執行 Git 流程
echo.
echo [1/3] 加入所有檔案 (git add .)
git add .

echo [2/3] 提交變更 (git commit)
git commit -m "%commit_msg%"

echo [3/3] 推送到遠端 (git push)
:: 嘗試直接推送
git push
if %errorlevel% equ 0 goto Success

:: 如果直接推送失敗，嘗試設定上游分支 (針對第一次上傳)
echo.
echo [注意] 直接推送失敗，嘗試設定上游分支 (git push -u origin master)...
git push -u origin master
if %errorlevel% equ 0 goto Success

:: 如果 master 也失敗，嘗試 main (GitHub 新版預設)
echo.
echo [注意] Master 推送失敗，嘗試設定 main 分支...
git push -u origin main
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