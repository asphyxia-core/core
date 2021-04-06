#!/bin/bash

mkdir -p build

regex='VERSION = '"'"'(.*)'"'"''
[[ $(cat ./src/util/Consts.ts) =~ $regex ]]

VERSION=${BASH_REMATCH[1]}

echo "Building Version $VERSION"

echo "Copying windows node binary cache"
mkdir -p ~/.pkg-cache/v2.6
cp ./build-env/pkg-cache/* ~/.pkg-cache/v2.6

echo "NPM Install"
npm ci

echo "Building Typescripts"
npx tsc

echo "Packing index.js"
npx ncc build ./dist/AsphyxiaCore.js -o ./build-env --external pug --external ts-node

echo "Setting Up Build Environment"
cd ./build-env
npm ci
cp typescript ./node_modules/

echo "Packing binaries"
npx pkg . -t "node12.16.1-win-x64,node12.16.1-win-x86,node12.16.1-linux-x64" -o ../build/asphyxia-core --options no-warnings

echo "Compressing"
cd ..
rm -f ./build/asphyxia-core-win-x64.zip
cd build
zip -qq asphyxia-core-win-x64.zip asphyxia-core-win-x64.exe
cd ..
zip -qq -r plugins

rm -f ./build/asphyxia-core-win-x86.zip
cd build
zip -qq asphyxia-core-win-x86.zip asphyxia-core-win-x86.exe
cd ..
zip -qq -r plugins

rm -f ./build/asphyxia-core-linux-x64.zip
cd build
zip -qq asphyxia-core-linux-x64.zip asphyxia-core-linux-x64
cd ..
zip -qq -r plugins