nocat
=====
NOde compatible Cat.

Simple syntax highlighting for the console via the [highlight.js](https://highlightjs.org) library.

This module is compatible with a large quantity of languages and provides a number of styles.


Installation
------------
Run the following to install:

	sudo npm install -g nocat


Module usage
------------

```javascript
var nocat = require('nocat');

nocat
	.on('file', function(file, mime, lang) {
		console.log('Processing', file, '...');
	})
	.on('end', function(file, content) {
		console.log(content);
	})
	.exec(program.args, {
		color: true,
		style: 'zenburn',
	})
```


CLI Usage
---------

```
  Usage: nocat [files...]

  Options:

    -h, --help             output usage information
    -V, --version          output the version number
    -l, --lang [language]  Force language setting. If unspecified it will be determined from mime
    -n, --no-color         Disable syntax highlighting and act like regular `cat`
    -v, --verbose          Be verbose
    -s, --style [style]    Set the output color style (default: sunburst)
    --list-languages       List available language highlighters
    --list-styles          List available styles
```
