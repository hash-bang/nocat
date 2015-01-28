var cheerio = require('cheerio');
var crayon = require('crayon-terminal');
var css = require('css');
var events = require('events');
var hljs = require('highlight.js');
var fs = require('fs');
var mime = require('mime');
var util = require('util');

function NOCat() {
	this._style = null;

	this.setStyle = function(styleName) {
		var self = this;

		if (this._style && this._style._name == styleName) return; // Already loaded
		// Load raw CSS AST {{{
		var styleFile = __dirname + '/node_modules/highlight.js/styles/' + styleName + '.css';
		if (!fs.existsSync(styleFile))
			throw new Error('Invalid style:', styleName);
		var ast = css.parse(fs.readFileSync(styleFile).toString(), {comments: true});
		// }}}
		// Extract color info from style object {{{
		this._style = {_name: styleName};
		ast.stylesheet.rules.forEach(function(rule) {
			if (!rule.selectors) return;
			rule.selectors.forEach(function(rawSelector) {
				rawSelector.split(/\s+/).forEach(function(selector) {
					if (/^\.hljs-.*$/.test(selector)) {
						var key = selector.substr(1);
						self._style[key] = {};
						rule.declarations.forEach(function(dec) {
							if (dec.property = 'color')
								self._style[key].color = dec.value;
						});
					}
				});
			});
		});
		// }}}
		return this;
	};

	this.exec = function(files, options, finish) {
		var self = this;

		var settings = {
			color: true,
			language: null, // null = auto
			style: 'zenburn',
		};

		if (options) // Read in optional settings (if any)
			for (var k in options)
				settings[k] = options[k];

		if (settings.style) this.setStyle(settings.style);

		files.forEach(function(file) {
			var langType = settings.language;

			// Process Language type {{{
			if (!langType) { // No language specified
				var mimeType = mime.lookup(file);
				if (!settings.color || mimeType == 'application/octet-stream') {
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
			self.emit('file', file, mimeType, langType);

			var output;
			if (langType == 'raw' || !self._style) {
				output = fs.readFileSync(file).toString();
			} else {
				var html = hljs.highlight(langType, fs.readFileSync(file).toString()).value;
				var $ = cheerio.load(html);
				$('span').replaceWith(function() {
					var span = $(this);
					for (var key in self._style) {
						if (span.hasClass(key))
							return crayon.foreground(self._style[key].color)($(this).text())
					}
					return $(this).text();
				});

				output = $.html()
					.replace(/\&apos;/g, "'")
					.replace(/\&quot;/g, '"')
			}

			if (finish) finish(null, file, output);
			self.emit('end', file, output);
		});
	
		return this;
	};
};
util.inherits(NOCat, events.EventEmitter);

module.exports = new NOCat();
