@echo off
REM Lance le site en local : double-clique sur ce fichier.
REM Pour arreter le serveur : ferme cette fenetre (ou Ctrl + C).

REM Se place dans le dossier du projet (celui ou se trouve ce fichier)
cd /d "%~dp0"

REM Premiere fois (ou apres un clone) : installe les dependances
if not exist node_modules (
    echo Installation des dependances, patiente un peu...
    call npm install
)

REM Ouvre le navigateur sur le site (il peut falloir rafraichir la page apres quelques secondes)
start "" http://localhost:3000

REM Demarre le serveur de developpement
call npm run dev

pause
