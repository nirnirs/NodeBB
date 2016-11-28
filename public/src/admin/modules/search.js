"use strict";
/* globals socket, app, define, ajaxify, config */

define(function () {
	var search = {};

	function nsToTitle(namespace) {
		return namespace.replace('admin/', '').split('/').map(function (str) {
			return str[0].toUpperCase() + str.slice(1);
		}).join(' > ');
	}

	function find(dict, term) {
		var html = dict.filter(function (elem) {
			return elem.translations.toLowerCase().includes(term);
		}).map(function (params) {
			var namespace = params.namespace;
			var translations = params.translations;
			var title = params.title == null ? nsToTitle(namespace) : params.title;

			var results = translations
				// remove all lines without a match
				.replace(new RegExp('^(?:(?!' + term + ').)*$', 'gmi'), '')
				// get up to 25 characaters of context on both sides of the match
				// and wrap the match in a `.search-match` element
				.replace(
					new RegExp('^[\\s\\S]*?(.{0,25})(' + term + ')(.{0,25})[\\s\\S]*?$', 'gmi'),
					'...$1<span class="search-match">$2</span>$3...<br>'
				)
				// collapse whitespace
				.replace(/(?:\n ?)+/g, '\n');

			return '<li role="presentation" class="result">' +
				'<a role= "menuitem" href= "' + config.relative_path + '/' + namespace + '" >' +
					title +
					'<br>' +
					'<small><code>' +
						results +
					'</small></code>' +
				'</a>' +
			'</li>';
		}).join('');
		return html;
	}

	search.init = function () {
		socket.emit('admin.getSearchDict', {}, function (err, dict) {
			if (err) {
				app.alertError(err);
				throw err;
			}
			setupACPSearch(dict);
		});
	};

	function setupACPSearch(dict) {
		var dropdown = $('#acp-search .dropdown');
		var menu = $('#acp-search .dropdown-menu');
		var input = $('#acp-search input');

		if (!config.searchEnabled) {
			menu.addClass('search-disabled');
		}

		input.on('keyup', function () {
			dropdown.addClass('open');
		});

		$('#acp-search').parents('form').on('submit', function (ev) {
			var firstResult = menu.find('li:first-child > a').attr('href');
			var href = firstResult ? firstResult : config.relative_path + '/search/' + input.val();

			ajaxify.go(href.replace(/^\//, ''));

			setTimeout(function () {
				dropdown.removeClass('open');
				input.blur();
			}, 150);

			ev.preventDefault();
			return false;
		});

		input.on('keyup focus', function () {
			var value = input.val().toLowerCase();
			menu.children('.result').remove();

			var len = value.length;
			var results;

			menu.toggleClass('state-start-typing', len === 0);
			menu.toggleClass('state-keep-typing', len > 0 && len < 3);
			
			if (len >= 3) {
				menu.prepend(find(dict, value));

				results = menu.children('.result').length;

				menu.toggleClass('state-no-results', !results);
				menu.toggleClass('state-yes-results', !!results);

				menu.find('.search-forum')
					.not('.divider')
					.find('a')
					.attr('href', config.relative_path + '/search/' + value)
					.find('strong')
					.html(value);
			} else {
				menu.removeClass('state-no-results');
			}
		});
	}

	return search;
});