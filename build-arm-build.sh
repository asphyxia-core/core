#!/bin/bash

echo "Packing binaries"
npx pkg ./build-env -t node10.15.3-linux-armv7 -o ./build/asphyxia-core --options no-warnings
