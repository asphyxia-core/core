#!/bin/bash

mkdir -p build

regex='VERSION = '"'"'([a-z0-9.]*)'"'"''
[[ $(cat ./src/utils/Consts.ts) =~ $regex ]]

VERSION=${BASH_REMATCH[1]}

echo "Building Version $VERSION for Linux"

echo "NPM Install"
npm ci

echo "Building Typescripts"
npx tsc

echo "Packing index.js"
npx ncc build ./dist/AsphyxiaCore.js -o ./build-env --external pug --external ts-node

echo "Setting Up Build Environment"
cd ./build-env
npm ci
cp -r typescript ./node_modules/

echo "Packing binaries"
cd ..
npx pkg ./build-env -t node12.16.1-linux-x64 -o ./build/asphyxia-core --options no-warnings

echo "Compressing"

rm -f ./build/asphyxia-core-linux-x64.zip
cd build
zip -qq asphyxia-core-linux-x64.zip asphyxia-core
cd ..
zip -qq ./build/asphyxia-core-linux-x64.zip -r plugins
