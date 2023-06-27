# Getting version
$VER_CODE = Select-String -Path ".\src\utils\Consts.ts" -Pattern "VERSION = '(.*)'"
$VERSION = $VER_CODE.Matches.Groups[1].Value;

Write-Output "Building Version $VERSION for Windows"

# Prepare directories
New-Item -Path "." -Name "build" -ItemType "directory" -Force | Out-Null

Write-Output "Copying windows node binary cache"
New-Item -Path "$env:USERPROFILE" -Name ".pkg-cache" -ItemType "directory" -Force | Out-Null
New-Item -Path "$env:USERPROFILE\.pkg-cache" -Name "v2.6" -ItemType "directory" -Force | Out-Null
Copy-Item -Path "build-env\pkg-cache\*" -Destination "$env:USERPROFILE\.pkg-cache\v2.6" 


Write-Output "NPM Install"
npm ci

# Building
Write-Output "Building Typescripts"
npx tsc

# Packing index.js
Write-Output "Packing index.js"
npx ncc build .\dist\AsphyxiaCore.js -o .\build-env --external pug --external ts-node

Write-Output "Setting Up Build Environment"
Set-Location -Path ".\build-env"
npm ci
Copy-Item -Recurse -Path "typescript" -Destination "node_modules/"

Set-Location -Path ".."

# Packing x64
Write-Output "Packing binaries"
npx pkg .\build-env -t "node16-win-x64" -o .\build\asphyxia-core-x64 --options no-warnings

Compress-Archive -Path ".\build\asphyxia-core-x64.exe", ".\plugins" -DestinationPath ".\build\asphyxia-core-win-x64.zip" -Force

# Packing x86
$env:PKG_CACHE_PATH = "$env:USERPROFILE\.pkg-cache"
$env:PKG_IGNORE_TAG = "true" # prevents pkg-fetch to add a tag folder
Invoke-WebRequest -Uri "https://latowolf.freeddns.org/ubuntu/www/built-v16.16.0-win-x86" -OutFile "built-v16.16.0-win-x86"
Move-Item -Path "built-v16.16.0-win-x86" -Destination "$env:USERPROFILE\.pkg-cache\"

npx pkg .\build-env -t "node16-win-x86" -o .\build\asphyxia-core-x86 --options no-warnings
Compress-Archive -Path ".\build\asphyxia-core-x86.exe", ".\plugins" -DestinationPath ".\build\asphyxia-core-win-x86.zip" -Force
