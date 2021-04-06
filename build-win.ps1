# Prepare directories
New-Item -Path "." -Name "build" -ItemType "directory" -Force | Out-Null

Write-Output "Building Windows Version"


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

# Packing
Write-Output "Packing binaries"
npx pkg .\build-env -t "node12.16.1-win-x64,node12.16.1-win-x86" -o .\build\asphyxia-core --options no-warnings

# Packing zips
Compress-Archive -Path ".\build\asphyxia-core-x64.exe", ".\plugins" -DestinationPath ".\build\asphyxia-core-win-x64.zip" -Force
Compress-Archive -Path ".\build\asphyxia-core-x86.exe", ".\plugins" -DestinationPath ".\build\asphyxia-core-win-x86.zip" -Force
