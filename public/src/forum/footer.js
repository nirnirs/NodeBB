define(['notifications', 'chat'], function(Notifications, Chat) {

	socket.emit('meta.updateHeader', {
		fields: ['username', 'picture', 'userslug']
	}, app.updateHeader);

	Notifications.prepareDOM();
	Chat.prepareDOM();
	translator.prepareDOM();

	function updateUnreadCount(err, tids) {
		var count = 0, unreadEl = $('#unread-count');

		if (err) {
			console.warn('Error updating unread count', err);
		} else if(tids && tids.length) {
			count = tids.length;
		}

		unreadEl
			.toggleClass('unread-count', count > 0)
			.attr('data-content', count > 20 ? '20+' : count);
	}


	socket.on('event:unread.updateCount', updateUnreadCount);
	socket.emit('user.getUnreadCount', updateUnreadCount);
});