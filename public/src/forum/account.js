define(['forum/accountheader'], function(header) {
	var Account = {};

	Account.init = function() {
		header.init();

		var yourid = templates.get('yourid'),
			theirid = templates.get('theirid'),
			isFollowing = templates.get('isFollowing');

		$(document).ready(function() {
			var username = $('.account-username a').html();
			app.enterRoom('user/' + theirid);

			app.addCommasToNumbers();
			$('.user-recent-posts img').addClass('img-responsive');

			var followBtn = $('#follow-btn');
			var unfollowBtn = $('#unfollow-btn');

			if (yourid !== theirid && yourid !== "0") {
				if (isFollowing) {
					followBtn.hide();
					unfollowBtn.show();
				} else {
					followBtn.show();
					unfollowBtn.hide();
				}
			} else {
				followBtn.hide();
				unfollowBtn.hide();
			}

			followBtn.on('click', function() {
				socket.emit('api:user.follow', {
					uid: theirid
				}, function(success) {
					if (success) {
						followBtn.hide();
						unfollowBtn.show();
						app.alertSuccess('You are now following ' + username + '!');
					} else {
						app.alertError('There was an error following' + username + '!');
					}
				});
				return false;
			});

			unfollowBtn.on('click', function() {
				socket.emit('api:user.unfollow', {
					uid: theirid
				}, function(success) {
					if (success) {
						followBtn.show();
						unfollowBtn.hide();
						app.alertSuccess('You are no longer following ' + username + '!');
					} else {
						app.alertError('There was an error unfollowing ' + username + '!');
					}
				});
				return false;
			});

			$('.user-recent-posts .topic-row').on('click', function() {
				ajaxify.go($(this).attr('topic-url'));
			});

			socket.on('api:user.isOnline', Account.handleUserOnline);

			socket.emit('api:user.isOnline', theirid, Account.handleUserOnline);

			socket.on('event:new_post', function(data) {
				var html = templates.prepare(templates['account'].blocks['posts']).parse(data);
				$('.user-recent-posts').prepend(html);
				$('.user-recent-posts span.timeago').timeago();
			});

		});
	};

	Account.handleUserOnline = function(data) {
		var onlineStatus = $('.account-online-status');

		if (data.online) {
			onlineStatus.find('span span').text('online');
			onlineStatus.find('i').attr('class', 'fa fa-circle');
		} else {
			onlineStatus.find('span span').text('offline');
			onlineStatus.find('i').attr('class', 'fa fa-circle-o');
		}
	};

	return Account;
});