#!/bin/bash

matugen image $1
cp -f $1 ~/.config/waypaper/cache/current
cp -f $1 /usr/share/sddm/themes/sugar-candy/Backgrounds/current

echo "Done!"
