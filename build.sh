#!/bin/bash
IFS='%'
out=intercom.js
out_min=intercom.min.js
out_amd=intercom.amd.js
out_amd_min=intercom.amd.min.js
banner="/*! intercom.js | https://github.com/diy/intercom.js | Apache License (v2) */"

append_file () {
	src=`cat $2 | sed 's/^ *//g' | sed 's/ *$//g'`
	echo -eE "$1\n\n// --- $2 ---\n\n$src"
}

# bundle files...

src=""
for file in lib/*.js; do
	if [ "$file" != "lib/intercom.js" ]; then src=`append_file "$src" $file`; fi
done
src=`append_file "$src" lib/intercom.js`
for file in lib/bindings/*.js; do src=`append_file "$src" $file`; done

# format and wrap...

src=`echo -e "$src" | while read line; do echo -e "\t$line"; done`
wrp="$banner\n\nvar Intercom = (function() {$src\n\treturn Intercom;\n})();"

echo -e "$wrp" > $out

wrp="$banner\n\ndefine(function() {$src\n\treturn Intercom;\n});"

echo -e "$wrp" > $out_amd

# generate minified version...

curl -s -d compilation_level=SIMPLE_OPTIMIZATIONS \
        -d output_format=text \
        -d output_info=compiled_code \
		--data-urlencode "js_code@$out" \
        http://closure-compiler.appspot.com/compile \
        > $out_min

echo "$banner" | cat - $out_min > temp && mv temp $out_min

curl -s -d compilation_level=SIMPLE_OPTIMIZATIONS \
        -d output_format=text \
        -d output_info=compiled_code \
		--data-urlencode "js_code@$out_amd" \
        http://closure-compiler.appspot.com/compile \
        > $out_amd_min

echo "$banner" | cat - $out_amd_min > temp && mv temp $out_amd_min

unset IFS
