#!/usr/bin/env node

var cheerio = require('cheerio');
var crayon = require('crayon-terminal');
var css = require('css');
var hljs = require('highlight.js');
var fs = require('fs');
var mime = require('mime');
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

// Load theme {{{
// Load raw CSS AST {{{
var styleFile = __dirname + '/node_modules/highlight.js/styles/' + program.style + '.css';
if (!fs.existsSync(styleFile)) {
	console.log('Invalid style:', program.style);
	process.exit(1);
}
var ast = css.parse(fs.readFileSync(styleFile).toString(), {comments: true});
// }}}
// Extract color info from style object {{{
var styles = {};
ast.stylesheet.rules.forEach(function(rule) {
	if (!rule.selectors) return;
	rule.selectors.forEach(function(rawSelector) {
		rawSelector.split(/\s+/).forEach(function(selector) {
			if (/^\.hljs-.*$/.test(selector)) {
				var key = selector.substr(1);
				styles[key] = {};
				rule.declarations.forEach(function(dec) {
					if (dec.property = 'color')
						styles[key].color = dec.value;
				});
			}
		});
	});
});
// }}}
// }}}

program.args.forEach(function(arg) {
	var langType = program.lang;

	// Process Language type {{{
	if (!langType) { // No language specified
		var mimeType = mime.lookup(arg);
		if (program.noColor || mimeType == 'application/octet-stream') {
			langType = 'raw';
		} else { // Identify from application/*
			var mimeBits = /^(.*)\/(.*)$/.exec(mimeType);
			if (hljs.listLanguages().indexOf(mimeBits[2]) > -1) {
				langType = mimeBits[2];
			} else {
				langType = 'raw';
			}
		}
	}
	// }}}
	if (program.verbose) console.log(arg + ': ' + mimeType + ' (' + langType + ')');

	if (langType == 'raw') {
		console.log(fs.readFileSync(arg).toString());
	} else {
		var html = hljs.highlight(langType, fs.readFileSync(arg).toString()).value;
		var $ = cheerio.load(html);
		$('span').replaceWith(function() {
			var span = $(this);
			for (var key in styles) {
				if (span.hasClass(key))
					return crayon.foreground(styles[key].color)($(this).text())
			}
			return $(this).text();
		});
		console.log(
			$.html()
				.replace(/\&apos;/g, "'")
				.replace(/\&quot;/g, '"')
		);
	}
});
