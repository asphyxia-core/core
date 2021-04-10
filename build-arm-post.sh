#!/bin/bash

echo "Compressing"

rm -f ./build/asphyxia-core-armv7.zip
cd build
zip -qq asphyxia-core-armv7.zip asphyxia-core
cd ..
zip -qq ./build/asphyxia-core-armv7.zip -r plugins