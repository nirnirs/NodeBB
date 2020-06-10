'use strict';


app = window.app || {};

app.isFocused = true;
app.currentRoom = null;
app.widgets = {};
app.cacheBuster = null;

(function () {
	var params = utils.params();
	var showWelcomeMessage = !!params.loggedin;
	var registerMessage = params.register;
	var isTouchDevice = utils.isTouchDevice();

	require(['benchpress'], function (Benchpress) {
		Benchpress.setGlobal('config', config);
		if (Object.defineProperty) {
			Object.defineProperty(window, 'templates', {
				configurable: true,
				enumerable: true,
				get: function () {
					console.warn('[deprecated] Accessing benchpress (formerly known as templates.js) globally is deprecated. Use `require(["benchpress"], function (Benchpress) { ... })` instead');
					return Benchpress;
				},
			});
		} else {
			window.templates = Benchpress;
		}
	});

	app.cacheBuster = config['cache-buster'];

	bootbox.setDefaults({
		locale: config.userLang,
	});

	app.load = function () {
		app.loadProgressiveStylesheet();

		overrides.overrideTimeago();

		var url = ajaxify.start(window.location.pathname.slice(1) + window.location.search + window.location.hash);
		ajaxify.updateHistory(url, true);
		ajaxify.parseData();
		ajaxify.end(url, app.template);

		handleStatusChange();

		if (config.searchEnabled) {
			app.handleSearch();
		}

		$('body').on('click', '#new_topic', function (e) {
			e.preventDefault();
			app.newTopic();
		});

		$('#header-menu .container').on('click', '[component="user/logout"]', function () {
			app.logout();
			return false;
		});

		Visibility.change(function (event, state) {
			if (state === 'visible') {
				app.isFocused = true;
				app.alternatingTitle('');
			} else if (state === 'hidden') {
				app.isFocused = false;
			}
		});

		createHeaderTooltips();
		app.showEmailConfirmWarning();
		app.showCookieWarning();

		socket.removeAllListeners('event:nodebb.ready');
		socket.on('event:nodebb.ready', function (data) {
			if ((data.hostname === app.upstreamHost) && (!app.cacheBuster || app.cacheBuster !== data['cache-buster'])) {
				app.cacheBuster = data['cache-buster'];

				app.alert({
					alert_id: 'forum_updated',
					title: '[[global:updated.title]]',
					message: '[[global:updated.message]]',
					clickfn: function () {
						window.location.reload();
					},
					type: 'warning',
				});
			}
		});
		socket.on('event:livereload', function () {
			if (app.user.isAdmin && !ajaxify.currentPage.match(/admin/)) {
				window.location.reload();
			}
		});

		require(['taskbar', 'helpers', 'forum/pagination'], function (taskbar, helpers, pagination) {
			taskbar.init();

			helpers.register();

			pagination.init();

			$(window).trigger('action:app.load');
		});
	};

	app.logout = function (redirect) {
		redirect = redirect === undefined ? true : redirect;
		$(window).trigger('action:app.logout');

		$.ajax(config.relative_path + '/logout', {
			type: 'POST',
			headers: {
				'x-csrf-token': config.csrf_token,
			},
			success: function (data) {
				$(window).trigger('action:app.loggedOut', data);
				if (redirect) {
					if (data.next) {
						window.location.href = data.next;
					} else {
						window.location.reload();
					}
				}
			},
		});
		return false;
	};

	app.alert = function (params) {
		require(['alerts'], function (alerts) {
			alerts.alert(params);
		});
	};

	app.removeAlert = function (id) {
		require(['alerts'], function (alerts) {
			alerts.remove(id);
		});
	};

	app.alertSuccess = function (message, timeout) {
		app.alert({
			title: '[[global:alert.success]]',
			message: message,
			type: 'success',
			timeout: timeout || 5000,
		});
	};

	app.alertError = function (message, timeout) {
		message = message.message || message;

		if (message === '[[error:invalid-session]]') {
			app.logout(false);
			return app.handleInvalidSession();
		}

		app.alert({
			title: '[[global:alert.error]]',
			message: message,
			type: 'danger',
			timeout: timeout || 10000,
		});
	};

	app.handleInvalidSession = function () {
		socket.disconnect();
		bootbox.alert({
			title: '[[error:invalid-session]]',
			message: '[[error:invalid-session-text]]',
			closeButton: false,
			callback: function () {
				window.location.reload();
			},
		});
	};

	app.enterRoom = function (room, callback) {
		callback = callback || function () {};
		if (socket && app.user.uid && app.currentRoom !== room) {
			var previousRoom = app.currentRoom;
			app.currentRoom = room;
			socket.emit('meta.rooms.enter', {
				enter: room,
			}, function (err) {
				if (err) {
					app.currentRoom = previousRoom;
					return app.alertError(err.message);
				}

				callback();
			});
		}
	};

	app.leaveCurrentRoom = function () {
		if (!socket) {
			return;
		}
		var previousRoom = app.currentRoom;
		app.currentRoom = '';
		socket.emit('meta.rooms.leaveCurrent', function (err) {
			if (err) {
				app.currentRoom = previousRoom;
				return app.alertError(err.message);
			}
		});
	};

	function highlightNavigationLink() {
		$('#main-nav li')
			.removeClass('active')
			.find('a')
			.filter(function (i, x) { return window.location.pathname.startsWith(x.getAttribute('href')); })
			.parent()
			.addClass('active');
	}

	app.createUserTooltips = function (els, placement) {
		if (isTouchDevice) {
			return;
		}
		els = els || $('body');
		els.find('.avatar,img[title].teaser-pic,img[title].user-img,div.user-icon,span.user-icon').each(function () {
			$(this).tooltip({
				placement: placement || $(this).attr('title-placement') || 'top',
				title: $(this).attr('title'),
			});
		});
	};

	app.createStatusTooltips = function () {
		if (!isTouchDevice) {
			$('body').tooltip({
				selector: '.fa-circle.status',
				placement: 'top',
			});
		}
	};

	app.processPage = function () {
		highlightNavigationLink();

		$('.timeago').timeago();

		utils.makeNumbersHumanReadable($('.human-readable-number'));

		utils.addCommasToNumbers($('.formatted-number'));

		app.createUserTooltips();

		app.createStatusTooltips();

		// Scroll back to top of page
		if (!ajaxify.isCold()) {
			window.scrollTo(0, 0);
		}
	};

	app.showMessages = function () {
		var messages = {
			login: {
				format: 'alert',
				title: '[[global:welcome_back]] ' + app.user.username + '!',
				message: '[[global:you_have_successfully_logged_in]]',
			},
			register: {
				format: 'modal',
			},
		};

		function showAlert(type, message) {
			switch (messages[type].format) {
				case 'alert':
					app.alert({
						type: 'success',
						title: messages[type].title,
						message: messages[type].message,
						timeout: 5000,
					});
					break;

				case 'modal':
					require(['translator'], function (translator) {
						translator.translate(message || messages[type].message, function (translated) {
							bootbox.alert({
								title: messages[type].title,
								message: translated,
							});
						});
					});
					break;
			}
		}

		if (showWelcomeMessage) {
			showWelcomeMessage = false;
			$(document).ready(function () {
				showAlert('login');
			});
		}
		if (registerMessage) {
			$(document).ready(function () {
				showAlert('register', utils.escapeHTML(decodeURIComponent(registerMessage)));
				registerMessage = false;
			});
		}
	};

	app.openChat = function (roomId, uid) {
		if (!app.user.uid) {
			return app.alertError('[[error:not-logged-in]]');
		}

		require(['chat'], function (chat) {
			function loadAndCenter(chatModal) {
				chat.load(chatModal.attr('data-uuid'));
				chat.center(chatModal);
				chat.focusInput(chatModal);
			}

			if (chat.modalExists(roomId)) {
				loadAndCenter(chat.getModal(roomId));
			} else {
				socket.emit('modules.chats.loadRoom', { roomId: roomId, uid: uid || app.user.uid }, function (err, roomData) {
					if (err) {
						return app.alertError(err.message);
					}
					roomData.users = roomData.users.filter(function (user) {
						return user && parseInt(user.uid, 10) !== parseInt(app.user.uid, 10);
					});
					roomData.uid = uid || app.user.uid;
					roomData.isSelf = true;
					chat.createModal(roomData, loadAndCenter);
				});
			}
		});
	};

	app.newChat = function (touid, callback) {
		function createChat() {
			socket.emit('modules.chats.newRoom', { touid: touid }, function (err, roomId) {
				if (err) {
					return app.alertError(err.message);
				}

				if (!ajaxify.data.template.chats) {
					app.openChat(roomId);
				} else {
					ajaxify.go('chats/' + roomId);
				}

				callback(false, roomId);
			});
		}

		callback = callback || function () {};
		if (!app.user.uid) {
			return app.alertError('[[error:not-logged-in]]');
		}

		if (parseInt(touid, 10) === parseInt(app.user.uid, 10)) {
			return app.alertError('[[error:cant-chat-with-yourself]]');
		}
		socket.emit('modules.chats.isDnD', touid, function (err, isDnD) {
			if (err) {
				return app.alertError(err.message);
			}
			if (!isDnD) {
				return createChat();
			}
			bootbox.confirm('[[modules:chat.confirm-chat-with-dnd-user]]', function (ok) {
				if (ok) {
					createChat();
				}
			});
		});
	};

	var	titleObj = {
		active: false,
		interval: undefined,
		titles: [],
	};

	app.alternatingTitle = function (title) {
		if (typeof title !== 'string') {
			return;
		}

		if (title.length > 0 && !app.isFocused) {
			if (!titleObj.titles[0]) {
				titleObj.titles[0] = window.document.title;
			}

			require(['translator'], function (translator) {
				translator.translate(title, function (translated) {
					titleObj.titles[1] = translated;
					if (titleObj.interval) {
						clearInterval(titleObj.interval);
					}

					titleObj.interval = setInterval(function () {
						var title = titleObj.titles[titleObj.titles.indexOf(window.document.title) ^ 1];
						if (title) {
							window.document.title = $('<div></div>').html(title).text();
						}
					}, 2000);
				});
			});
		} else {
			if (titleObj.interval) {
				clearInterval(titleObj.interval);
			}
			if (titleObj.titles[0]) {
				window.document.title = $('<div></div>').html(titleObj.titles[0]).text();
			}
		}
	};

	app.refreshTitle = function (title) {
		if (!title) {
			return;
		}
		require(['translator'], function (translator) {
			title = config.titleLayout.replace(/&#123;/g, '{').replace(/&#125;/g, '}')
				.replace('{pageTitle}', function () { return title; })
				.replace('{browserTitle}', function () { return config.browserTitle; });

			// Allow translation strings in title on ajaxify (#5927)
			title = translator.unescape(title);

			translator.translate(title, function (translated) {
				titleObj.titles[0] = translated;
				app.alternatingTitle('');
			});
		});
	};

	app.toggleNavbar = function (state) {
		var navbarEl = $('.navbar');
		if (navbarEl) {
			navbarEl.toggleClass('hidden', !state);
		}
	};

	function createHeaderTooltips() {
		var env = utils.findBootstrapEnvironment();
		if (env === 'xs' || env === 'sm' || isTouchDevice) {
			return;
		}
		$('#header-menu li a[title]').each(function () {
			$(this).tooltip({
				placement: 'bottom',
				trigger: 'hover',
				title: $(this).attr('title'),
			});
		});


		$('#search-form').parent().tooltip({
			placement: 'bottom',
			trigger: 'hover',
			title: $('#search-button i').attr('title'),
		});


		$('#user_dropdown').tooltip({
			placement: 'bottom',
			trigger: 'hover',
			title: $('#user_dropdown').attr('title'),
		});
	}

	app.enableTopicSearch = function (options) {
		var quickSearchResults = options.searchElements.resultEl;
		var inputEl = options.searchElements.inputEl;
		var searchTimeoutId = 0;
		var oldValue = inputEl.val();
		inputEl.on('blur', function () {
			setTimeout(function () {
				if (!inputEl.is(':focus')) {
					quickSearchResults.addClass('hidden');
				}
			}, 200);
		});
		inputEl.on('focus', function () {
			if (inputEl.val() && quickSearchResults.find('#quick-search-results').children().length) {
				quickSearchResults.removeClass('hidden');
			}
		});

		inputEl.off('keyup').on('keyup', function () {
			if (searchTimeoutId) {
				clearTimeout(searchTimeoutId);
				searchTimeoutId = 0;
			}
			searchTimeoutId = setTimeout(function () {
				if (inputEl.val().length < 3) {
					quickSearchResults.addClass('hidden');
					oldValue = inputEl.val();
					return;
				}
				if (inputEl.val() === oldValue) {
					return;
				}
				oldValue = inputEl.val();
				if (!inputEl.is(':focus')) {
					return quickSearchResults.addClass('hidden');
				}
				require(['search'], function (search) {
					options.searchOptions = options.searchOptions || { in: 'titles' };
					options.searchOptions.term = inputEl.val();
					search.quick(options);
				});
			}, 250);
		});
	};

	app.handleSearch = function (searchOptions) {
		searchOptions = searchOptions || { in: 'titles' };
		var searchButton = $('#search-button');
		var searchFields = $('#search-fields');
		var searchInput = $('#search-fields input');
		var quickSearchContainer = $('#quick-search-container');

		$('#search-form .advanced-search-link').off('mousedown').on('mousedown', function () {
			ajaxify.go('/search');
		});

		$('#search-form').off('submit').on('submit', function () {
			searchInput.blur();
		});
		searchInput.off('blur').on('blur', dismissSearch);
		searchInput.off('focus');

		var searchElements = {
			inputEl: searchInput,
			resultEl: quickSearchContainer,
		};

		app.enableTopicSearch({
			searchOptions: searchOptions,
			searchElements: searchElements,
		});

		function dismissSearch() {
			searchFields.addClass('hidden');
			searchButton.removeClass('hidden');
		}

		searchButton.off('click').on('click', function (e) {
			if (!config.loggedIn && !app.user.privileges['search:content']) {
				app.alert({
					message: '[[error:search-requires-login]]',
					timeout: 3000,
				});
				ajaxify.go('login');
				return false;
			}
			e.stopPropagation();

			app.prepareSearch();
			return false;
		});

		$('#search-form').off('submit').on('submit', function () {
			var input = $(this).find('input');
			require(['search'], function (search) {
				var data = search.getSearchPreferences();
				data.term = input.val();
				$(window).trigger('action:search.submit', {
					data: data,
					searchElements: searchElements,
				});
				search.query(data, function () {
					input.val('');
				});
			});
			return false;
		});
	};

	app.prepareSearch = function () {
		$('#search-fields').removeClass('hidden');
		$('#search-button').addClass('hidden');
		$('#search-fields input').focus();
	};

	function handleStatusChange() {
		$('[component="header/usercontrol"] [data-status]').off('click').on('click', function (e) {
			var status = $(this).attr('data-status');
			socket.emit('user.setStatus', status, function (err) {
				if (err) {
					return app.alertError(err.message);
				}
				$('[data-uid="' + app.user.uid + '"] [component="user/status"], [component="header/profilelink"] [component="user/status"]')
					.removeClass('away online dnd offline')
					.addClass(status);
				$('[component="header/usercontrol"] [data-status]').each(function () {
					$(this).find('span').toggleClass('bold', $(this).attr('data-status') === status);
				});
				app.user.status = status;
			});
			e.preventDefault();
		});
	}

	app.updateUserStatus = function (el, status) {
		if (!el.length) {
			return;
		}

		require(['translator'], function (translator) {
			translator.translate('[[global:' + status + ']]', function (translated) {
				el.removeClass('online offline dnd away')
					.addClass(status)
					.attr('title', translated)
					.attr('data-original-title', translated);
			});
		});
	};

	app.newTopic = function (cid, tags) {
		$(window).trigger('action:composer.topic.new', {
			cid: cid || ajaxify.data.cid || 0,
			tags: tags || (ajaxify.data.tag ? [ajaxify.data.tag] : []),
		});
	};

	app.loadJQueryUI = function (callback) {
		if (typeof $().autocomplete === 'function') {
			return callback();
		}

		var scriptEl = document.createElement('script');
		scriptEl.type = 'text/javascript';
		scriptEl.src = config.relative_path + '/assets/vendor/jquery/js/jquery-ui.js?' + config['cache-buster'];
		scriptEl.onload = callback;
		document.head.appendChild(scriptEl);
	};

	app.showEmailConfirmWarning = function (err) {
		if (!config.requireEmailConfirmation || !app.user.uid) {
			return;
		}
		var msg = {
			alert_id: 'email_confirm',
			type: 'warning',
			timeout: 0,
		};

		if (!app.user.email) {
			msg.message = '[[error:no-email-to-confirm]]';
			msg.clickfn = function () {
				app.removeAlert('email_confirm');
				ajaxify.go('user/' + app.user.userslug + '/edit');
			};
			app.alert(msg);
		} else if (!app.user['email:confirmed'] && !app.user.isEmailConfirmSent) {
			msg.message = err ? err.message : '[[error:email-not-confirmed]]';
			msg.clickfn = function () {
				app.removeAlert('email_confirm');
				socket.emit('user.emailConfirm', {}, function (err) {
					if (err) {
						return app.alertError(err.message);
					}
					app.alertSuccess('[[notifications:email-confirm-sent]]');
				});
			};

			app.alert(msg);
		} else if (!app.user['email:confirmed'] && app.user.isEmailConfirmSent) {
			msg.message = '[[error:email-not-confirmed-email-sent]]';
			app.alert(msg);
		}
	};

	app.parseAndTranslate = function (template, blockName, data, callback) {
		require(['translator', 'benchpress'], function (translator, Benchpress) {
			function translate(html, callback) {
				translator.translate(html, function (translatedHTML) {
					translatedHTML = translator.unescape(translatedHTML);
					callback($(translatedHTML));
				});
			}

			if (typeof blockName === 'string') {
				Benchpress.parse(template, blockName, data, function (html) {
					translate(html, callback);
				});
			} else {
				callback = data;
				data = blockName;
				Benchpress.parse(template, data, function (html) {
					translate(html, callback);
				});
			}
		});
	};

	app.loadProgressiveStylesheet = function () {
		var linkEl = document.createElement('link');
		linkEl.rel = 'stylesheet';
		linkEl.href = config.relative_path + '/assets/js-enabled.css?' + app.cacheBuster;

		document.head.appendChild(linkEl);
	};

	app.showCookieWarning = function () {
		require(['translator', 'storage'], function (translator, storage) {
			if (!config.cookies.enabled || !navigator.cookieEnabled) {
				// Skip warning if cookie consent subsystem disabled (obviously), or cookies not in use
				return;
			} else if (window.location.pathname.startsWith(config.relative_path + '/admin')) {
				// No need to show cookie consent warning in ACP
				return;
			} else if (storage.getItem('cookieconsent') === '1') {
				return;
			}

			config.cookies.message = translator.unescape(config.cookies.message);
			config.cookies.dismiss = translator.unescape(config.cookies.dismiss);
			config.cookies.link = translator.unescape(config.cookies.link);
			config.cookies.link_url = translator.unescape(config.cookies.link_url);

			app.parseAndTranslate('partials/cookie-consent', config.cookies, function (html) {
				$(document.body).append(html);
				$(document.body).addClass('cookie-consent-open');

				var warningEl = $('.cookie-consent');
				var dismissEl = warningEl.find('button');
				dismissEl.on('click', function () {
					// Save consent cookie and remove warning element
					storage.setItem('cookieconsent', '1');
					warningEl.remove();
					$(document.body).removeClass('cookie-consent-open');
				});
			});
		});
	};

	app.reskin = function (skinName) {
		var clientEl = Array.prototype.filter.call(document.querySelectorAll('link[rel="stylesheet"]'), function (el) {
			return el.href.indexOf(config.relative_path + '/assets/client') !== -1;
		})[0] || null;
		if (!clientEl) {
			return;
		}

		var currentSkinClassName = $('body').attr('class').split(/\s+/).filter(function (className) {
			return className.startsWith('skin-');
		});
		if (!currentSkinClassName[0]) {
			return;
		}
		var currentSkin = currentSkinClassName[0].slice(5);
		currentSkin = currentSkin !== 'noskin' ? currentSkin : '';

		// Stop execution if skin didn't change
		if (skinName === currentSkin) {
			return;
		}

		var linkEl = document.createElement('link');
		linkEl.rel = 'stylesheet';
		linkEl.type = 'text/css';
		linkEl.href = config.relative_path + '/assets/client' + (skinName ? '-' + skinName : '') + '.css';
		linkEl.onload = function () {
			clientEl.parentNode.removeChild(clientEl);

			// Update body class with proper skin name
			$('body').removeClass(currentSkinClassName.join(' '));
			$('body').addClass('skin-' + (skinName || 'noskin'));
		};

		document.head.appendChild(linkEl);
	};

	app.updateTags = function () {
		var metaWhitelist = ['title', 'description', /og:.+/, /article:.+/].map(function (val) {
			return new RegExp(val);
		});
		var linkWhitelist = ['canonical', 'alternate', 'up'];

		// Delete the old meta tags
		Array.prototype.slice
			.call(document.querySelectorAll('head meta'))
			.filter(function (el) {
				var name = el.getAttribute('property') || el.getAttribute('name');
				return metaWhitelist.some(function (exp) {
					return !!exp.test(name);
				});
			})
			.forEach(function (el) {
				document.head.removeChild(el);
			});

		// Add new meta tags
		ajaxify.data._header.tags.meta
			.filter(function (tagObj) {
				var name = tagObj.name || tagObj.property;
				return metaWhitelist.some(function (exp) {
					return !!exp.test(name);
				});
			})
			.forEach(function (tagObj) {
				var metaEl = document.createElement('meta');
				Object.keys(tagObj).forEach(function (prop) {
					metaEl.setAttribute(prop, tagObj[prop]);
				});
				document.head.appendChild(metaEl);
			});

		// Delete the old link tags
		Array.prototype.slice
			.call(document.querySelectorAll('head link'))
			.filter(function (el) {
				var name = el.getAttribute('rel');
				return linkWhitelist.some(function (item) {
					return item === name;
				});
			})
			.forEach(function (el) {
				document.head.removeChild(el);
			});

		// Add new link tags
		ajaxify.data._header.tags.link
			.filter(function (tagObj) {
				return linkWhitelist.some(function (item) {
					return item === tagObj.rel;
				});
			})
			.forEach(function (tagObj) {
				var linkEl = document.createElement('link');
				Object.keys(tagObj).forEach(function (prop) {
					linkEl.setAttribute(prop, tagObj[prop]);
				});
				document.head.appendChild(linkEl);
			});
	};
}());
