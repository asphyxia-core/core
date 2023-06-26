#!/bin/bash

# apt-get install -y build-essential patch

mkdir /root/.pkg-cache
mkdir /root/.pkg-cache/node
chmod 777 /root
chmod 777 /root/.pkg-cache
chmod 777 /root/.pkg-cache/node
export PKG_IGNORE_TAG=true # prevents pkg-fetch to add a tag folder
curl https://github.com/yao-pkg/pkg-binaries/releases/download/node16/built-v16.16.0-linux-armv7 -LO /root/.pkg-cache/built-v16.16.0-linux-armv7 # download the binary, be sure it is prefixewd with built-, otherwise it will not work

echo "Packing binaries"
npx pkg ./build-env -t node16-linux-armv7 -o ./build/asphyxia-core --options no-warnings
