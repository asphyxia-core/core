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
npx ncc build .\dist\AsphyxiaCore.js -o .\build-env --external pug --external ts-node

# Packing
Write-Output "Packing exe"
npx pkg .\build-env -t "node12.16.1-win-x64,node12.16.1-win-x86" -o .\build\asphyxia-core --options no-warnings
