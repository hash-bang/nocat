var async = require('async-chainable');
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
	this._stylePath = __dirname + '/node_modules/highlight.js/styles';
	this._mime2language = require('./mime2language');

	this.setStyle = function(styleName) {
		var self = this;

		if (this._style && this._style._name == styleName) return this; // Already loaded
		// Load raw CSS AST {{{
		var styleFile = this._stylePath + '/' + styleName + '.css';
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
							if (dec.property == 'color') {
								self._style[key].color = dec.value;
							} else if (dec.property == 'font-weight' && dec.value == 'bold') {
								self._style[key].bold = true;
							} else if (dec.property == 'text-decoration' && dec.value == 'underline') {
								self._style[key].underline = true;
							}
						});
					}
				});
			});
		});
		// }}}
		return this;
	};

	this.getStyles = function() {
		return fs.readdirSync(this._stylePath).map(function(file) {
			return file.replace(/\.css$/, '');
		});
	};

	this.getLanguages = function() {
		return hljs.listLanguages();
	};

	this.exec = function(files, options, finish) {
		var self = this;

		var settings = {
			color: true,
			language: null, // null = auto
			style: 'sunburst',
		};

		if (options) // Read in optional settings (if any)
			for (var k in options)
				settings[k] = options[k];

		if (settings.style) this.setStyle(settings.style);

		files.forEach(function(file) {
			var langType = settings.language;
			var mimeType = null; 

			async()
				.then(function(next) { // Detect mime by file name
					mimeType = mime.lookup(file);
					next();
				})
				.then(function(next) { // Try to map mime against mime lookups
					if (self._mime2language[mimeType]) {
						langType = self._mime2language[mimeType];
						next();
					}

					// No luck - try looking at the application/* bit (e.g. application/javascript)
					var mimeBits = /^(.*)\/(.*)$/.exec(mimeType);
					if (self.getLanguages().indexOf(mimeBits[2]) > -1) {
						langType = mimeBits[2];
					} else {
						langType = 'raw';
					}
					next();
				})
				.then(function(next) { // No mime? Set to raw
					if (mimeType && langType) return next(); // Found in a previous stage
					langType = 'raw';
				})
				.end(function(err) {
					if (err) {
						self.emit('error', err);
						return;
					}

					self.emit('file', file, mimeType, langType);

					var output;
					if (langType == 'raw' || !self._style) {
						output = fs.readFileSync(file).toString();
					} else {
						var html = hljs.highlight(langType, fs.readFileSync(file).toString()).value;
						var $ = cheerio.load(html);
						$('span').replaceWith(function() {
							var span = $(this);
							var pen = [];
							for (var key in self._style) {
								if (span.hasClass(key)) {
									if (self._style[key].color)
										pen.push(self._style[key].color);
									if (self._style[key].bold)
										pen.push('bold');
									if (self._style[key].underline)
										pen.push('underline');
								}
							}
							if (pen)
								return crayon.apply(this, pen)($(this).text())
							return $(this).text();
						});

						output = $.html()
							.replace(/\&apos;/g, "'")
							.replace(/\&quot;/g, '"')
					}

					if (finish) finish(null, file, output);
					self.emit('end', file, output);
				});
		});
	
		return this;
	};
};
util.inherits(NOCat, events.EventEmitter);

module.exports = new NOCat();
