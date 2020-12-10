# Getting version
$VER_CODE = Select-String -Path ".\src\utils\Consts.ts" -Pattern "VERSION = '(.*)'"
$VERSION = $VER_CODE.Matches.Groups[1].Value;

Write-Output "Building Version $VERSION"

# Building
Write-Output "Building Typescripts"
npx tsc

# Prepare directories
New-Item -Path "." -Name "build" -ItemType "directory" -Force | Out-Null

# Packing index.js
Write-Output "Packing index.js"
npx ncc build .\dist\AsphyxiaCore.js -o .\build-env --external pug --external ts-node --external systray

# Packing
Write-Output "Packing exe"
npx pkg .\build-env -t "node12.16.1-win-x64,node12.16.1-win-x86,node12.16.1-linux-x64" -o .\build\asphyxia-core --options no-warnings

# Packing zips
Compress-Archive -Path ".\build\asphyxia-core-win-x64.exe", ".\plugins" -DestinationPath ".\build\asphyxia-core-win-x64.zip" -Force
Compress-Archive -Path ".\build\asphyxia-core-win-x86.exe", ".\plugins" -DestinationPath ".\build\asphyxia-core-win-x86.zip" -Force
Compress-Archive -Path ".\build\asphyxia-core-linux-x64", ".\plugins" -DestinationPath ".\build\asphyxia-core-linux-x64.zip" -Force
