#!/bin/bash

chmod 777 /root/.pkg-cache/
echo "Packing binaries"
npx pkg ./build-env -t node16-linux-arm64 -o ./build/asphyxia-core --options no-warnings
