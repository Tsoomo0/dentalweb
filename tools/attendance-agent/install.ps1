# DentaSuite ирцийн агентыг Task Scheduler-т бүртгэнэ:
#   - Windows-д нэвтэрмэгц
#   - 5 минут тутам (компьютер асаалттай байх хугацаанд)
# attendance-agent.exe болон config.json энэ файлтай нэг хавтсанд байх ёстой.
param(
    [string]$TaskName = 'DentaSuite Attendance Agent',
    [switch]$NoTest
)

$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $dir 'attendance-agent.exe'
$config = Join-Path $dir 'config.json'

if (-not (Test-Path $exe)) {
    Write-Host "attendance-agent.exe олдсонгүй: $dir" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $config)) {
    Write-Host 'config.json олдсонгүй.' -ForegroundColor Red
    Write-Host 'HR → Ирцийн төхөөрөмж хуудаснаас агентын тохиргоог хуулж, энэ хавтсанд config.json нэрээр хадгална уу.'
    exit 1
}

$user = "$env:USERDOMAIN\$env:USERNAME"
$action = New-ScheduledTaskAction -Execute $exe -WorkingDirectory $dir
$every5 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
$logon = New-ScheduledTaskTrigger -AtLogOn -User $user
# Зөөврийн компьютер батарейгаар ажиллаж байсан ч, хоцорсон ажиллалтыг асмагц нөхөж ажиллуулна.
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

try {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($logon, $every5) `
        -Settings $settings -Principal $principal -Force | Out-Null
}
catch {
    # Зарим компьютерт "нэвтрэхэд" trigger админ эрх шаарддаг — 5 минутын trigger дангаараа хангалттай.
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $every5 `
        -Settings $settings -Principal $principal -Force | Out-Null
}

Write-Host "Бүртгэгдлээ: Task Scheduler → $TaskName" -ForegroundColor Green

if (-not $NoTest) {
    Write-Host 'Холболтыг шалгаж байна...'
    Start-Process -FilePath $exe -ArgumentList '--test' -Wait
}
