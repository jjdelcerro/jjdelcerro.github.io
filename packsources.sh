#!/bin/bash
cd $(dirname $0)
# Para el informe de desarrollo 
find $PWD \( -path "$PWD/tmp" -o -path "$PWD/.??*" -o -path "*.png" \) -prune -o -print | packfiles >tmp/personalweb-sources.txt

