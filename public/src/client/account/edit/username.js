'use strict';

/* globals define, ajaxify, socket, app, utils, config  */

define('forum/account/edit/username', ['forum/account/header'], function(header) {
	var AccountEditUsername = {};

	AccountEditUsername.init = function() {
		header.init();

		$('#submitBtn').on('click', function updateUsername() {
			var userData = {
				uid: $('#inputUID').val(),
				username: $('#inputNewUsername').val(),
				password: $('#inputCurrentPassword').val()
			};

			if (!userData.username) {
				return;
			}
			var btn = $(this);
			btn.addClass('disabled').find('i').removeClass('hide');
			socket.emit('user.changeUsernameEmail', userData, function(err, data) {
				btn.removeClass('disabled').find('i').addClass('hide');
				if (err) {
					return app.alertError(err.message);
				}

				var userslug = utils.slugify(userData.username);
				if (userData.username && userslug && parseInt(userData.uid, 10) === parseInt(app.user.uid, 10)) {
					$('[component="header/profilelink"]').attr('href', config.relative_path + '/user/' + userslug);
					$('[component="header/username"]').text(userData.username);
					$('[component="header/usericon"]').css('background-color', data['icon:bgColor']).text(data['icon:text']);
				}

				ajaxify.go('user/' + userslug);
			});

			return false;
		});
	};

	return AccountEditUsername;
});
