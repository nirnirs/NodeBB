'use strict';

/* globals define, socket, app, templates, bootbox */

define('forum/users', ['translator'], function(translator) {
	var	Users = {};

	var loadingMoreUsers = false;

	Users.init = function() {
		app.enterRoom('user_list');

		$('.nav-pills li').removeClass('active').find('a[href="' + window.location.pathname + '"]').parent().addClass('active');

		handleSearch();

		handleInvite();

		socket.removeListener('event:user_status_change', onUserStatusChange);
		socket.on('event:user_status_change', onUserStatusChange);

		$('#load-more-users-btn').on('click', loadMoreUsers);

		$(window).off('scroll').on('scroll', function() {
			var bottom = ($(document).height() - $(window).height()) * 0.9;

			if ($(window).scrollTop() > bottom && !loadingMoreUsers) {
				loadMoreUsers();
			}
		});
	};

	function loadMoreUsers() {
		var set = '';
		var activeSection = getActiveSection();
		if (activeSection === 'sort-posts') {
			set = 'users:postcount';
		} else if (activeSection === 'sort-reputation') {
			set = 'users:reputation';
		} else if (activeSection === 'online') {
			set = 'users:online';
		} else if (activeSection === 'users') {
			set = 'users:joindate';
		}

		if (set) {
			startLoading(set, $('#users-container').children('.registered-user').length);
		}
	}

	function startLoading(set, after) {
		loadingMoreUsers = true;

		socket.emit('user.loadMore', {
			set: set,
			after: after
		}, function(err, data) {
			if (data && data.users.length) {
				onUsersLoaded(data);
				$('#load-more-users-btn').removeClass('disabled');
			} else {
				$('#load-more-users-btn').addClass('disabled');
			}
			loadingMoreUsers = false;
		});
	}

	function onUsersLoaded(data) {
		data.users = data.users.filter(function(user) {
			return !$('.users-box[data-uid="' + user.uid + '"]').length;
		});

		templates.parse('users', 'users', data, function(html) {
			translator.translate(html, function(translated) {
				translated = $(translated);
				$('#users-container').append(translated);
				translated.find('span.timeago').timeago();
				$('#users-container .anon-user').appendTo($('#users-container'));
			});
		});
	}

	function handleSearch() {
		var timeoutId = 0;

		$('#search-user').on('keyup', function() {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = 0;
			}

			timeoutId = setTimeout(doSearch, 250);
		});

		$('.search select, .search input[type="checkbox"]').on('change', function() {
			doSearch();
		});

		$('.users').on('click', '.pagination a', function() {
			doSearch($(this).attr('data-page'));
			return false;
		});
	}

	function doSearch(page) {
		var username = $('#search-user').val();
		page = page || 1;

		if (!username) {
			return loadPage(page);
		}

		socket.emit('user.search', {
			query: username,
			page: page,
			searchBy: 'username',
			sortBy: $('.search select').val(),
			onlineOnly: $('.search .online-only').is(':checked')
		}, function(err, data) {
			if (err) {
				return app.alertError(err.message);
			}

			renderSearchResults(data);
		});
	}

	function loadPage(page) {
		socket.emit('user.loadSearchPage', {page: page, onlineOnly: $('.search .online-only').is(':checked')}, function(err, data) {
			if (err) {
				return app.alertError(err.message);
			}

			renderSearchResults(data);
		});
	}

	function renderSearchResults(data) {
		$('#load-more-users-btn').addClass('hide');
		templates.parse('partials/paginator', {pagination: data.pagination}, function(html) {
			$('.pagination-container').replaceWith(html);
		});

		templates.parse('users', 'users', data, function(html) {
			translator.translate(html, function(translated) {
				$('#users-container').html(translated);
			});
		});

	}

	function onUserStatusChange(data) {
		var section = getActiveSection();

		if ((section.startsWith('online') || section.startsWith('users'))) {
			updateUser(data);
		}
	}

	function updateUser(data) {
		app.updateUserStatus($('#users-container [data-uid="' + data.uid +'"] [component="user/status"]'), data.status);
	}

	function getActiveSection() {
		var url = window.location.href,
			parts = url.split('/');
		return parts[parts.length - 1];
	}

	function handleInvite() {
		$('[component="user/invite"]').on('click', function() {
			bootbox.prompt('Email: ', function(email) {
				if (!email) {
					return;
				}

				socket.emit('user.invite', email, function(err) {
					if (err) {
						return app.alertError(err.message);
					}
					app.alertSuccess('[[users:invitation-email-sent, ' + email + ']]');
				});
			});
		});
	}

	return Users;
});
