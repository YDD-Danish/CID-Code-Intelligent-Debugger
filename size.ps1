'
$size = (Get-ChildItem "$env:USERPROFILE\C.I.D" -Recurse -Force -Exclude "venv","__pycache__","*.db" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch ''\\venv\\|\\__pycache__\\'' } | Measure-Object -Property Length -Sum).Sum
"Project size: {0:N2} MB" -f ($size / 1MB)
' | Out-File "$env:USERPROFILE\C.I.D\check_size.ps1"