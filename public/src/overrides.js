'use strict';

if ('undefined' !== typeof window) {

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
		};

		$.fn.selectRange = function(start, end) {
			if(!end) {
				end = start;
			}
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

		//http://stackoverflow.com/questions/511088/use-javascript-to-place-cursor-at-end-of-text-in-text-input-element
		$.fn.putCursorAtEnd = function() {
			return this.each(function() {
				$(this).focus();

				if (this.setSelectionRange) {
					var len = $(this).val().length * 2;
					this.setSelectionRange(len, len);
				} else {
					$(this).val($(this).val());
				}
				this.scrollTop = 999999;
			});
		};

	})(jQuery || {fn:{}});


	// FIX FOR #1245 - https://github.com/designcreateplay/NodeBB/issues/1245
	// from http://stackoverflow.com/questions/15931962/bootstrap-dropdown-disappear-with-right-click-on-firefox
	// obtain a reference to the original handler
	var _clearMenus = $._data(document, "events").click.filter(function (el) {
		return el.namespace === 'bs.data-api.dropdown' && el.selector === undefined;
	});

	if(_clearMenus.length) {
		_clearMenus = _clearMenus[0].handler;
	}

	// disable the old listener
	$(document)
		.off('click.data-api.dropdown', _clearMenus)
		.on('click.data-api.dropdown', function (e) {
			// call the handler only when not right-click
			e.button === 2 || _clearMenus();
		});

}
