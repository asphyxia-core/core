#!/bin/bash

mkdir -p build

regex='VERSION = '"'"'(.*)'"'"''
[[ $(cat ./src/util/Consts.ts) =~ $regex ]]

VERSION=${BASH_REMATCH[1]}

echo "Building Version $VERSION for arm64"

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
npx pkg ./build-env -t node10.15.3-linux-armv7 -o ./build/asphyxia-core --options no-warnings

echo "Compressing"

rm -f ./build/asphyxia-core-armv7.zip
cd build
zip -qq asphyxia-core-armv7.zip asphyxia-core
cd ..
zip -qq asphyxia-core-armv7.zip -r plugins
