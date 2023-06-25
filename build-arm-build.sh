#!/bin/bash

echo "Packing binaries"
npx pkg ./build-env -t node16-linux-armv7 -o ./build/asphyxia-core --options no-warnings
# npx pkg ./build-env -t node16-linux-arm64 -o ./build/asphyxia-core --options no-warnings
