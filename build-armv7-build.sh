#!/bin/bash

# apt-get install -y build-essential patch

mkdir /root/.pkg-cache
mkdir /root/.pkg-cache/node
chmod 777 /root
chmod 777 /root/.pkg-cache
chmod 777 /root/.pkg-cache/node

curl https://latowolf.freeddns.org/ubuntu/www/node-v16.19.1-linux-armv7 -o /root/.pkg-cache/node/node-v16.19.1-linux-armv7

echo "Packing binaries"
npx pkg ./build-env -t node16-linux-armv7 -o ./build/asphyxia-core --options no-warnings
