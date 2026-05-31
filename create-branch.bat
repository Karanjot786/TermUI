@echo off
cd /d "C:\Users\sande\GSSOC\Term-UI"
echo Current location: %cd%

echo.
echo Creating branch feat/screenmode-viewport...
git checkout -b feat/screenmode-viewport

echo.
echo Adding files...
git add -A

echo.
echo Committing changes...
git commit -m "feat: add screenMode prop with alternate/main/inline rendering modes"

echo.
echo Branch status:
git branch -v

echo.
echo Current branch:
git branch --show-current

echo.
echo Recent commit:
git --no-pager log --oneline -1

echo.
echo Branch created successfully! Ready for pull request.
pause
