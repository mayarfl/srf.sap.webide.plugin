git remote remove github
git remote add github https://github.houston.softwaregrp.net/srf/srf.sap.webide.plugin.git
git.exe fetch -v --progress "github"

git.exe checkout master --
git.exe pull --progress -v --no-rebase origin master
git.exe push --progress github master:master

echo off

rem git.exe checkout srf_1_10_1_10 --
rem git.exe pull --progress -v --no-rebase origin srf_1_10_1_10
rem git.exe push --progress github srf_1_10_1_10:srf_1_10

rem git.exe checkout srf_cp --
rem git.exe pull --progress -v --no-rebase origin srf_cp
rem git.exe push --progress github srf_cp:srf_cp


rem git.exe checkout -b srf_cp remotes/origin/srf_cp --
rem git.exe pull --progress -v --no-rebase origin srf_cp
rem git.exe push --progress github srf_cp:srf_cp

rem git.exe checkout -b srf_095_publicbeta remotes/origin/srf_095_publicbeta --
rem git.exe pull --progress -v --no-rebase origin srf_095_publicbeta
rem git.exe push --progress github srf_095_publicbeta:srf_095_publicbeta

rem git.exe checkout -b srf_09_privatebeta remotes/origin/srf_09_privatebeta --
rem git.exe pull --progress -v --no-rebase origin srf_09_privatebeta
rem git.exe push --progress github srf_09_privatebeta:srf_09_privatebeta