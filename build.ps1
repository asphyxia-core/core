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
npx pkg .\build-env -t "node12-win-x64,node12-win-x86,node12-linux-x64" -o .\build\asphyxia-core

# Renaming 64bit versions
# Move-Item -Path ".\build\asphyxia-x64.exe" -Destination ".\build\asphyxia.exe" -Force | Out-Null

# Packing zips
# Compress-Archive -Path ".\build\asphyxia.exe" -DestinationPath ".\build\asphyxia-$VERSION.zip" -Force
# Compress-Archive -Path ".\build\asphyxia-x86.exe" -DestinationPath ".\build\asphyxia-$VERSION-x86.zip" -Force
