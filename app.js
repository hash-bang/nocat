#!/usr/bin/env node

var nocat = require('./index');
var program = require('commander');

program
	.version(require('./package.json').version)
	.usage('[files...]')
	.option('-l, --lang [language]', 'Force language setting. If unspecified it will be determined from mime')
	.option('--list', 'List available language highlighters')
	.option('-n, --no-color', 'Disable syntax highlighting and act like regular `cat`')
	.option('-v, --verbose', 'Be verbose')
	.option('-s, --style [style]', 'Set the output color style (default: zenburn)', 'zenburn')
	.parse(process.argv);

if (program.noColor) program.lang = 'raw';
// Deal with `--list` {{{
if (program.list) {
	hljs.listLanguages().forEach(function(lang) {
		console.log(lang);
	});
	process.exit();
}
// }}}

nocat
	.on('file', function(file, mime, lang) {
		if (program.verbose) console.log(file + ': ' + mime + ' (' + lang + ')');
	})
	.on('end', function(file, content) {
		console.log(content);
	})
	.exec(program.args, {
		color: !program.noColor,
		language: program.lang,
		style: program.style,
	})
