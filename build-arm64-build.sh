#!/bin/bash
mkdir /root
mkdir /root/.pkg-cache
mkdir /root/.pkg-cache/node
chmod 777 /root
chmod 777 /root/.pkg-cache
chmod 777 /root/.pkg-cache/node
echo "Packing binaries"
npx pkg ./build-env -t node16-linux-arm64 -o ./build/asphyxia-core --options no-warnings
