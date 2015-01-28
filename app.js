#!/usr/bin/env node

var nocat = require('./index');
var program = require('commander');

program
	.version(require('./package.json').version)
	.usage('[files...]')
	.option('-l, --lang [language]', 'Force language setting. If unspecified it will be determined from mime')
	.option('-n, --no-color', 'Disable syntax highlighting and act like regular `cat`')
	.option('-v, --verbose', 'Be verbose')
	.option('-s, --style [style]', 'Set the output color style (default: sunburst)', 'sunburst')
	.option('--list-languages', 'List available language highlighters')
	.option('--list-styles', 'List available styles')
	.parse(process.argv);

if (program.noColor) program.lang = 'raw';
// Deal with `--list-styles` {{{
if (program.listStyles) {
	nocat.getStyles().forEach(function(style) {
		console.log(style);
	});
	process.exit();
}
// }}}
// Deal with `--list-langs` {{{
if (program.listLanguages) {
	nocat.getLanguages().forEach(function(lang) {
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
	.on('error', function(err) {
		console.log('Error: ', err);
	})
	.exec(program.args, {
		color: !program.noColor,
		language: program.lang,
		style: program.style,
	})
