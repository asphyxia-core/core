#!/bin/bash

chmod 777 /root
mkdir /root/.pkg-cache
chmod 777 /root/.pkg-cache

export PKG_IGNORE_TAG=true # prevents pkg-fetch to add a tag folder
cp ./build-env/pkg-cache/built-v16.16.0-linux-armv7 /root/.pkg-cache/built-v16.16.0-linux-armv7
chmod 777 /root/.pkg-cache/built-v16.16.0-linux-armv7

echo "Packing armv7"
npx pkg ./build-env -t node16.16.0-linux-armv7 -o ./build/asphyxia-core --options no-warnings

echo "Packing arm64"
npx pkg ./build-env -t node16.16.0-linux-arm64 -o ./build/asphyxia-core --options no-warnings
