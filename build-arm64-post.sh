#!/bin/bash

echo "Compressing"

rm -f ./build/asphyxia-core-arm64.zip
cd build
zip -qq asphyxia-core-arm64.zip asphyxia-core
cd ..
zip -qq ./build/asphyxia-core-arm64.zip -r plugins