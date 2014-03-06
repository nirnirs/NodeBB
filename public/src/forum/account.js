define(['forum/accountheader'], function(header) {
	var Account = {};

	Account.init = function() {
		header.init();

		var yourid = templates.get('yourid'),
			theirid = templates.get('theirid'),
			isFollowing = templates.get('isFollowing');

		$(document).ready(function() {
			var username = $('.account-username').html();
			app.enterRoom('user/' + theirid);

			app.addCommasToNumbers();
			app.makeNumbersHumanReadable($('.account .human-readable-number'));
			$('.user-recent-posts img').addClass('img-responsive');

			var followBtn = $('#follow-btn');
			var unfollowBtn = $('#unfollow-btn');
			var chatBtn = $('#chat-btn');

			if (yourid !== theirid && yourid !== "0") {
				if (isFollowing) {
					followBtn.addClass('hide');
					unfollowBtn.removeClass('hide');
				} else {
					followBtn.removeClass('hide');
					unfollowBtn.addClass('hide');
				}
				chatBtn.removeClass('hide');
			} else {
				followBtn.addClass('hide');
				unfollowBtn.addClass('hide');
				chatBtn.addClass('hide');
			}

			followBtn.on('click', function() {
				socket.emit('user.follow', {
					uid: theirid
				}, function(err) {
					if(err) {
						return app.alertError('There was an error following' + username + '!');
					}

					followBtn.addClass('hide');
					unfollowBtn.removeClass('hide');
					app.alertSuccess('[[global:alert.follow, ' + username + ']]');
				});
				return false;
			});

			unfollowBtn.on('click', function() {
				socket.emit('user.unfollow', {
					uid: theirid
				}, function(err) {
					if(err) {
						return app.alertError('There was an error unfollowing ' + username + '!');
					}

					followBtn.removeClass('hide');
					unfollowBtn.addClass('hide');
					app.alertSuccess('[[global:alert.unfollow, ' + username + ']]');
				});
				return false;
			});

			chatBtn.on('click', function() {
				app.openChat(username, theirid);
			});

			socket.on('user.isOnline', Account.handleUserOnline);

			socket.emit('user.isOnline', theirid, Account.handleUserOnline);

			socket.on('event:new_post', function(data) {
				var html = templates.prepare(templates['account'].blocks['posts']).parse(data);
				$('.user-recent-posts').prepend(html);
				$('.user-recent-posts span.timeago').timeago();
			});

		});
	};

	Account.handleUserOnline = function(err, data) {
		var onlineStatus = $('.account-online-status');

		if(parseInt(templates.get('theirid'), 10) !== parseInt(data.uid, 10)) {
			return;
		}

		translator.translate('[[global:' + data.status + ']]', function(translated) {
			onlineStatus.attr('class', 'account-online-status fa fa-circle status ' + data.status)
				.attr('title', translated)
				.attr('data-original-title', translated);
		});

	};

	return Account;
});
