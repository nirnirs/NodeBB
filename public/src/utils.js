(function(module) {
	'use strict';

	var utils, fs, XRegExp;

	if ('undefined' === typeof window) {
		fs = require('fs');
		XRegExp = require('xregexp').XRegExp;

		process.profile = function(operation, start) {
			var diff = process.hrtime(start);
			console.log('%s took %d milliseconds', operation, diff[0] * 1e3 + diff[1] / 1e6);
		}

	} else {
		XRegExp = window.XRegExp;
	}


	module.exports = utils = {
		generateUUID: function() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = Math.random() * 16 | 0,
					v = c === 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		},

		//Adapted from http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
		walk: function(dir, done) {
			var results = [],
				path = require('path'),
				main_dir = path.join(__dirname, '..', 'templates');

			fs.readdir(dir, function(err, list) {
				if (err) {
					return done(err);
				}
				var pending = list.length;
				if (!pending) {
					return done(null, results);
				}
				list.forEach(function(file) {
					file = dir + '/' + file;
					fs.stat(file, function(err, stat) {
						if (stat && stat.isDirectory()) {
							utils.walk(file, function(err, res) {
								results = results.concat(res);
								if (!--pending) {
									done(null, results);
								}
							});
						} else {
							results.push(file.replace(main_dir + '/', '').replace('.tpl', ''));
							if (!--pending) {
								done(null, results);
							}
						}
					});
				});
			});
		},

		relativeTime: function(timestamp, min) {
			var now = +new Date(),
				difference = now - Math.floor(parseFloat(timestamp));

			if(difference < 0) {
				difference = 0;
			}

			difference = Math.floor(difference / 1000);

			if (difference < 60) {
				return difference + (min ? 's' : ' second') + (difference !== 1 && !min ? 's' : '');
			}

			difference = Math.floor(difference / 60);
			if (difference < 60) {
				return difference + (min ? 'm' : ' minute') + (difference !== 1 && !min ? 's' : '');
			}

			difference = Math.floor(difference / 60);
			if (difference < 24) {
				return difference + (min ? 'h' : ' hour') + (difference !== 1 && !min ? 's' : '');
			}

			difference = Math.floor(difference / 24);
			if (difference < 30) {
				return difference + (min ? 'd' : ' day') + (difference !== 1 && !min ? 's' : '');
			}

			difference = Math.floor(difference / 30);
			if (difference < 12) {
				return difference + (min ? 'mon' : ' month') + (difference !== 1 && !min ? 's' : '');
			}

			difference = Math.floor(difference / 12);
			return difference + (min ? 'y' : ' year') + (difference !== 1 && !min ? 's' : '');
		},

		invalidUnicodeChars : XRegExp('[^\\p{L}\\s\\d\\-_]', 'g'),
		invalidLatinChars : /[^\w\s\d\-_]/g,

		trimRegex : /^\s+|\s+$/g,
		collapseWhitespace : /\s+/g,
		collapseDash : /-+/g,
		trimTrailingDash : /-$/g,
		trimLeadingDash : /^-/g,
		isLatin : /^[\w]+$/,

		//http://dense13.com/blog/2009/05/03/converting-string-to-slug-javascript/
		slugify: function(str) {
			str = str.replace(utils.trimRegex, '');
			str = str.toLowerCase();
			if(utils.isLatin.test(str)) {
				str = str.replace(utils.invalidLatinChars, '-');
			} else {
				str = XRegExp.replace(str, utils.invalidUnicodeChars, '-');
			}
			str = str.replace(utils.collapseWhitespace, '-')
			str = str.replace(utils.collapseDash, '-');
			str = str.replace(utils.trimTrailingDash, '');
			str = str.replace(utils.trimLeadingDash, '');
			return str;
		},

		// from http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
		isEmailValid: function(email) {
			// var re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
			return email.indexOf('@') !== -1;
		},

		isUserNameValid: function(name) {
			return (name && name !== "" && (/^['"\s\-.*0-9\u00BF-\u1FFF\u2C00-\uD7FF\w]+$/.test(name)));
		},

		isPasswordValid: function(password) {
			return password && password.indexOf(' ') === -1;
		},
		isNumber: function(n) {
			return !isNaN(parseFloat(n)) && isFinite(n);
		},
		// shallow objects merge
		merge: function() {
			var result = {}, obj, keys;
			for (var i = 0; i < arguments.length; i++) {
				obj = arguments[i] || {};
				keys = Object.keys(obj);
				for (var j = 0; j < keys.length; j++) {
					result[keys[j]] = obj[keys[j]];
				}
			}
			return result;
		},

		isRelativeUrl: function(url) {
			var firstChar = url.slice(0, 1);
			return (firstChar === '.' || firstChar === '/');
		},

		makeNumberHumanReadable: function(num) {
			var n = parseInt(num, 10);
			if(!n) {
				return num;
			}
			if (n > 999999) {
				return (n / 1000000).toFixed(1) + 'm';
			}
			else if(n > 999) {
				return (n / 1000).toFixed(1) + 'k';
			}
			return n;
		},

		toISOString: function(timestamp) {
			if(!timestamp) {
				return '';
			}

			try {
				return new Date(parseInt(timestamp, 10)).toISOString();
			} catch(e){
				console.log(timestamp, e.stack);
			}
			return '';
		}

	};


	if (!String.prototype.trim) {
		String.prototype.trim = function() {
			return this.replace(utils.trimRegex, '');
		};
	}

	if ('undefined' !== typeof window) {
		window.utils = module.exports;

		(function ($, undefined) {
			$.fn.getCursorPosition = function() {
				var el = $(this).get(0);
				var pos = 0;
				if('selectionStart' in el) {
					pos = el.selectionStart;
				} else if('selection' in document) {
					el.focus();
					var Sel = document.selection.createRange();
					var SelLength = document.selection.createRange().text.length;
					Sel.moveStart('character', -el.value.length);
					pos = Sel.text.length - SelLength;
				}
				return pos;
			}

			$.fn.selectRange = function(start, end) {
				if(!end) end = start;
				return this.each(function() {
					if (this.setSelectionRange) {
						this.focus();
						this.setSelectionRange(start, end);
					} else if (this.createTextRange) {
						var range = this.createTextRange();
						range.collapse(true);
						range.moveEnd('character', end);
						range.moveStart('character', start);
						range.select();
					}
				});
			};

		})(jQuery);
	}

})('undefined' === typeof module ? {
	module: {
		exports: {}
	}
} : module);