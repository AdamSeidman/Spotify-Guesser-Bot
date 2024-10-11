@ECHO OFF
CD ..

IF EXIST temp.txt DEL /F temp.txt
TASKLIST /NH /FI "WINDOWTITLE EQ Spotify Guesser Bot" > temp.txt
SET /P titlequery=<temp.txt
IF NOT "%titlequery%" == "INFO: No tasks are running which match the specified criteria." (GOTO HasInst)

:CreateBot
REM ECHO.
REM ECHO Pulling new changes...
REM GIT pull
ECHO.
ECHO Initializing...
ECHO.
TITLE Spotify Guesser Bot
NODE .
ECHO Program will now restart...
ECHO.
GOTO CreateBot

:HasInst
ECHO There is already an instance of the bot running.
ECHO Exit now to prevent replacing that instance.
ECHO.
PAUSE

TASKKILL /F /FI "WINDOWTITLE EQ Spotify Guesser Bot"
PAUSE
CLS
GOTO CreateBot
