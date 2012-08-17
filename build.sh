#!/bin/bash

out=intercom.js
out_min=intercom.min.js
files=""
banner="/*! intercom.js | https://github.com/diy/intercom.js | Apache License (v2) */"

for file in lib/*.js; do
	if [ "$file" != "lib/intercom.js" ]; then
		files="${files} $file"
	fi
done

files="${files} lib/intercom.js"

for file in lib/bindings/*.js; do files="${files} $file"; done

src=$(cat $files)
src="var Intercom=(function(){$src return Intercom;})();"

echo "$src" > $out

curl -s -d compilation_level=SIMPLE_OPTIMIZATIONS \
        -d output_format=text \
        -d output_info=compiled_code \
		--data-urlencode "js_code@$out" \
        http://closure-compiler.appspot.com/compile \
        > $out_min

echo "$banner" | cat - $out_min > temp && mv temp $out_min