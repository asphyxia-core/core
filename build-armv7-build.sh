#!/bin/bash

mkdir /root/.pkg-cache
mkdir /root/.pkg-cache/node
chmod 777 /root
chmod 777 /root/.pkg-cache
chmod 777 /root/.pkg-cache/node

export PKG_IGNORE_TAG=true # prevents pkg-fetch to add a tag folder
cp ./build-env/pkg-cache/built-v16.16.0-linux-armv7 -o /root/.pkg-cache/built-v16.16.0-linux-armv7
chmod 777 /root/.pkg-cache/built-v16.16.0-linux-armv7
echo "Packing binaries"
npx pkg ./build-env -t node16.16.0-linux-armv7 -o ./build/asphyxia-core --options no-warnings
