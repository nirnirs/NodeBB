"use strict";
/*global io, templates, translator, ajaxify, utils, bootbox, RELATIVE_PATH, config*/

var	socket,
	app = app || {};

app.isFocused = true;
app.isConnected = false;
app.currentRoom = null;
app.widgets = {};
app.cacheBuster = null;

// TODO: deprecate in 0.7.0, use app.user
app.username = null;
app.uid = null;

(function () {
	var showWelcomeMessage = false;
	var reconnecting = false;

	function socketIOConnect() {
		var ioParams = {
			reconnectionAttempts: config.maxReconnectionAttempts,
			reconnectionDelay : config.reconnectionDelay,
			transports: config.socketioTransports,
			path: config.relative_path + '/socket.io'
		};

		socket = io.connect(config.websocketAddress, ioParams);
		reconnecting = false;

		socket.on('event:connect', function (data) {
			// TODO : deprecate in 0.7.0, use app.user
			app.username = data.username;
			app.userslug = data.userslug;
			app.picture = data.picture;
			app.uid = data.uid;
			app.isAdmin = data.isAdmin;

			app.showLoginMessage();
			app.replaceSelfLinks();
			$(window).trigger('action:connected');
			app.isConnected = true;
		});

		socket.on('connect', onSocketConnect);

		socket.on('event:disconnect', function() {
			$(window).trigger('action:disconnected');
			app.isConnected = false;
			socket.connect();
		});

		socket.on('reconnecting', function (attempt) {
			if(attempt === parseInt(config.maxReconnectionAttempts, 10)) {
				socket.io.attempts = 0;
				return;
			}

			reconnecting = true;
			var reconnectEl = $('#reconnect');

			if (!reconnectEl.hasClass('active')) {
				reconnectEl.html('<i class="fa fa-spinner fa-spin"></i>');
			}

			reconnectEl.addClass('active').removeClass("hide").tooltip({
				placement: 'bottom'
			});
		});

		socket.on('event:banned', function() {
			app.alert({
				title: '[[global:alert.banned]]',
				message: '[[global:alert.banned.message]]',
				type: 'danger',
				timeout: 1000
			});

			setTimeout(function() {
				window.location.href = config.relative_path + '/';
			}, 1000);
		});
	}

	function onSocketConnect(data) {
		if (reconnecting) {
			var reconnectEl = $('#reconnect');

			reconnectEl.tooltip('destroy');
			reconnectEl.html('<i class="fa fa-check"></i>');
			reconnecting = false;

			// Rejoin room that was left when we disconnected
			var	url_parts = window.location.pathname.slice(RELATIVE_PATH.length).split('/').slice(1);
			var room;

			switch(url_parts[0]) {
				case 'user':
					room = 'user/' + ajaxify.variables.get('theirid');
				break;
				case 'topic':
					room = 'topic_' + url_parts[1];
				break;
				case 'category':
					room = 'category_' + url_parts[1];
				break;
				case 'recent':	// intentional fall-through
				case 'unread':
					room = 'recent_posts';
				break;
				case 'admin':
					room = 'admin';
				break;
				case 'home':
					room = 'home';
				break;
			}
			app.currentRoom = '';
			app.enterRoom(room);

			socket.emit('meta.reconnected');

			app.isConnected = true;
			$(window).trigger('action:reconnected');

			setTimeout(function() {
				reconnectEl.removeClass('active').addClass('hide');
			}, 3000);
		}
	}

	app.logout = function() {
		require(['csrf'], function(csrf) {
			$.ajax(RELATIVE_PATH + '/logout', {
				type: 'POST',
				headers: {
					'x-csrf-token': csrf.get()
				},
				success: function() {
					window.location.href = RELATIVE_PATH + '/';
				}
			});
		});
	};

	app.alert = function (params) {
		require(['alerts'], function(alerts) {
			alerts.alert(params);
		});
	};

	app.removeAlert = function(id) {
		require(['alerts'], function(alerts) {
			alerts.remove(id);
		});
	};

	app.alertSuccess = function (message, timeout) {
		app.alert({
			title: '[[global:alert.success]]',
			message: message,
			type: 'success',
			timeout: timeout ? timeout : 2000
		});
	};

	app.alertError = function (message, timeout) {
		app.alert({
			title: '[[global:alert.error]]',
			message: message,
			type: 'danger',
			timeout: timeout ? timeout : 5000
		});
	};

	app.enterRoom = function (room) {
		if (socket) {
			if (app.currentRoom === room) {
				return;
			}

			socket.emit('meta.rooms.enter', {
				enter: room,
				username: app.username,
				userslug: app.userslug,
				picture: app.picture
			});

			app.currentRoom = room;
		}
	};

	function highlightNavigationLink() {
		var path = window.location.pathname,
			parts = path.split('/'),
			active = parts[parts.length - 1];

		$('#main-nav li').removeClass('active');
		if (active) {
			$('#main-nav li a').each(function () {
				var href = $(this).attr('href');
				if (active === "sort-posts" || active === "sort-reputation" || active === "search" || active === "latest" || active === "online") {
					active = 'users';
				}

				if (href && href.match(active)) {
					$(this.parentNode).addClass('active');
					return false;
				}
			});
		}
	}

	app.createUserTooltips = function() {
		$('img[title].teaser-pic,img[title].user-img').each(function() {
			$(this).tooltip({
				placement: 'top',
				title: $(this).attr('title')
			});
		});
	};

	app.createStatusTooltips = function() {
		$('body').tooltip({
			selector:'.fa-circle.status',
			placement: 'top'
		});
	};

	app.replaceSelfLinks = function(selector) {
		selector = selector || $('a');
		selector.each(function() {
			var href = $(this).attr('href');
			if (href && app.userslug && href.indexOf('user/_self_') !== -1) {
				$(this).attr('href', href.replace(/user\/_self_/g, 'user/' + app.userslug));
			}
		});
	};

	app.processPage = function () {
		highlightNavigationLink();

		$('span.timeago').timeago();

		utils.makeNumbersHumanReadable($('.human-readable-number'));

		utils.addCommasToNumbers($('.formatted-number'));

		app.createUserTooltips();

		app.createStatusTooltips();

		app.replaceSelfLinks();

		setTimeout(function () {
			window.scrollTo(0, 1); // rehide address bar on mobile after page load completes.
		}, 100);
	};

	app.showLoginMessage = function () {
		function showAlert() {
			app.alert({
				type: 'success',
				title: '[[global:welcome_back]] ' + app.username + '!',
				message: '[[global:you_have_successfully_logged_in]]',
				timeout: 5000
			});
		}

		if (showWelcomeMessage) {
			showWelcomeMessage = false;
			if (document.readyState !== 'complete') {
				$(document).ready(showAlert);
			} else {
				showAlert();
			}
		}
	};

	app.openChat = function (username, touid) {
		if (username === app.username) {
			return app.alertError('[[error:cant-chat-with-yourself]]');
		}

		if (!app.uid) {
			return app.alertError('[[error:not-logged-in]]');
		}

		require(['chat'], function (chat) {
			function loadAndCenter(chatModal) {
				chat.load(chatModal.attr('UUID'));
				chat.center(chatModal);
				chat.focusInput(chatModal);
			}

			if (!chat.modalExists(touid)) {
				chat.createModal(username, touid, loadAndCenter);
			} else {
				loadAndCenter(chat.getModal(touid));
			}
		});
	};

	var	titleObj = {
			active: false,
			interval: undefined,
			titles: []
		};

	app.alternatingTitle = function (title) {
		if (typeof title !== 'string') {
			return;
		}

		if (title.length > 0 && !app.isFocused) {
			if (!titleObj.titles[0]) {
				titleObj.titles[0] = window.document.title;
			}

			translator.translate(title, function(translated) {
				titleObj.titles[1] = translated;
				if (titleObj.interval) {
					clearInterval(titleObj.interval);
				}

				titleObj.interval = setInterval(function() {
					var title = titleObj.titles[titleObj.titles.indexOf(window.document.title) ^ 1];
					if (title) {
						window.document.title = $('<div/>').html(title).text();
					}
				}, 2000);
			});
		} else {
			if (titleObj.interval) {
				clearInterval(titleObj.interval);
			}
			if (titleObj.titles[0]) {
				window.document.title = $('<div/>').html(titleObj.titles[0]).text();
			}
		}
	};

	app.refreshTitle = function(url) {
		if (!url) {
			var a = document.createElement('a');
			a.href = document.location;
			url = a.pathname.slice(1);
		}

		socket.emit('meta.buildTitle', url, function(err, title, numNotifications) {
			if (err) {
				return;
			}
			titleObj.titles[0] = (numNotifications > 0 ? '(' + numNotifications + ') ' : '') + title;
			app.alternatingTitle('');
		});
	};

	app.toggleNavbar = function(state) {
		var navbarEl = $('.navbar');
		if (navbarEl) {
			navbarEl.toggleClass('hidden', !!!state);
		}
	};

	function exposeConfigToTemplates() {
		$(document).ready(function() {
			templates.setGlobal('loggedIn', config.loggedIn);
			templates.setGlobal('relative_path', RELATIVE_PATH);
			for(var key in config) {
				if (config.hasOwnProperty(key)) {
					templates.setGlobal('config.' + key, config[key]);
				}
			}
		});
	}

	function createHeaderTooltips() {
		if (utils.findBootstrapEnvironment() === 'xs') {
			return;
		}
		$('#header-menu li [title]').each(function() {
			$(this).tooltip({
				placement: 'bottom',
				title: $(this).attr('title')
			});
		});

		$('#search-form').parent().tooltip({
			placement: 'bottom',
			title: $('#search-button i').attr('title')
		});

		$('#user_dropdown').tooltip({
			placement: 'bottom',
			title: $('#user_dropdown').attr('title')
		});
	}

	function handleSearch() {
		var searchButton = $("#search-button"),
			searchFields = $("#search-fields"),
			searchInput = $('#search-fields input');

		$('#search-form').on('submit', dismissSearch);
		searchInput.on('blur', dismissSearch);

		function dismissSearch(){
			searchFields.hide();
			searchButton.show();
		}

		function prepareSearch() {
			searchFields.removeClass('hide').show();
			searchButton.hide();
			searchInput.focus();
		}

		searchButton.on('click', function(e) {
			if (!config.loggedIn && !config.allowGuestSearching) {
				app.alert({
					message:'[[error:search-requires-login]]',
					timeout: 3000
				});
				ajaxify.go('login');
				return false;
			}
			e.stopPropagation();

			prepareSearch();
			return false;
		});

		require(['search', 'mousetrap'], function(search, Mousetrap) {
			$('#search-form').on('submit', function (e) {
				e.preventDefault();
				var input = $(this).find('input');

				search.query(input.val(), 'posts', function() {
					input.val('');
				});
			});

			$('.topic-search')
				.on('click', '.prev', function() {
					search.topicDOM.prev();
				})
				.on('click', '.next', function() {
					search.topicDOM.next();
				});

			Mousetrap.bind('ctrl+f', function(e) {
				if (config.topicSearchEnabled) {
					// If in topic, open search window and populate, otherwise regular behaviour
					var match = ajaxify.currentPage.match(/^topic\/([\d]+)/),
						tid;
					if (match) {
						e.preventDefault();
						tid = match[1];
						searchInput.val('in:topic-' + tid + ' ');
						prepareSearch();
					}
				}
			});
		});
	}

	function collapseNavigationOnClick() {
		$('#main-nav a, #user-control-list a, #logged-out-menu li a, #logged-in-menu .visible-xs').off('click').on('click', function() {
			if($('.navbar .navbar-collapse').hasClass('in')) {
				$('.navbar-header button').click();
			}
		});
	}

	function handleStatusChange() {
		$('#user-control-list .user-status').off('click').on('click', function(e) {
			var status = $(this).attr('data-status');
			socket.emit('user.setStatus', status, function(err, data) {
				if(err) {
					return app.alertError(err.message);
				}
				$('#logged-in-menu #user_label #user-profile-link>i').attr('class', 'fa fa-circle status ' + status);
			});
			e.preventDefault();
		});
	}

	app.load = function() {
		$('document').ready(function () {
			var url = ajaxify.removeRelativePath(window.location.pathname.slice(1).replace(/\/$/, "")),
				tpl_url = ajaxify.getTemplateMapping(url),
				search = window.location.search,
				hash = window.location.hash,
				$window = $(window);


			$window.trigger('action:ajaxify.start', {
				url: url
			});

			collapseNavigationOnClick();

			handleStatusChange();

			if (config.searchEnabled) {
				handleSearch();
			}

			$('#logout-link').on('click', app.logout);

			Visibility.change(function(e, state){
				if (state === 'visible') {
					app.isFocused = true;
					app.alternatingTitle('');
				} else if (state === 'hidden') {
					app.isFocused = false;
				}
			});

			createHeaderTooltips();
			showEmailConfirmWarning();

			ajaxify.variables.parse();
			ajaxify.currentPage = url;

			$window.trigger('action:ajaxify.contentLoaded', {
				url: url
			});

			if (window.history && window.history.replaceState) {
				window.history.replaceState({
					url: url + search + hash
				}, url, RELATIVE_PATH + '/' + url + search + hash);
			}

			ajaxify.loadScript(tpl_url, function() {
				ajaxify.widgets.render(tpl_url, url, function() {
					app.processPage();
					$window.trigger('action:ajaxify.end', {
						url: url
					});
				});
			});

			socket.removeAllListeners('event:nodebb.ready');
			socket.on('event:nodebb.ready', function(cacheBusters) {
				if (
					!app.cacheBusters ||
					app.cacheBusters.general !== cacheBusters.general ||
					app.cacheBusters.css !== cacheBusters.css ||
					app.cacheBusters.js !== cacheBusters.js
				) {
					app.cacheBusters = cacheBusters;

					app.alert({
						alert_id: 'forum_updated',
						title: '[[global:updated.title]]',
						message: '[[global:updated.message]]',
						clickfn: function() {
							window.location.reload();
						},
						type: 'warning'
					});
				}
			});

			require(['taskbar'], function(taskbar) {
				taskbar.init();
			});
		});
	};

	function showEmailConfirmWarning() {
		if (config.requireEmailConfirmation && app.user.uid && !app.user['email:confirmed']) {
			app.alert({
				alert_id: 'email_confirm',
				message: '[[error:email-not-confirmed]]',
				type: 'warning',
				timeout: 0,
				clickfn: function() {
					app.removeAlert('email_confirm');
					socket.emit('user.emailConfirm', {}, function(err) {
						if (err) {
							return app.alertError(err.message);
						}
						app.alertSuccess('[[notifications:email-confirm-sent]]');
					});
				}
			});
		}
	}

	showWelcomeMessage = window.location.href.indexOf('loggedin') !== -1;

	exposeConfigToTemplates();

	socketIOConnect();

	app.cacheBuster = config['cache-buster'];

	require(['csrf'], function(csrf) {
		csrf.set(config.csrf_token);
	});

	bootbox.setDefaults({
		locale: config.userLang
	});

	app.alternatingTitle('');

}());
