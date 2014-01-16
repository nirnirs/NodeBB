define(function() {
	var	Topics = {};

	Topics.init = function() {
		var topicsListEl = document.querySelector('.topics'),
			loadMoreEl = document.getElementById('topics_loadmore');

		this.resolveButtonStates();

		$(topicsListEl).on('click', '[data-action]', function() {
			var $this = $(this),
				action = this.getAttribute('data-action'),
				tid = $this.parents('[data-tid]').attr('data-tid');

			switch (action) {
				case 'pin':
					if (!$this.hasClass('active')) {
						socket.emit('topics.pin', {
							tid: tid
						}, Topics.pin);
					} else {
						socket.emit('topics.unpin', {
							tid: tid
						}, Topics.unpin);
					}
					break;

				case 'lock':
					if (!$this.hasClass('active')) {
						socket.emit('topics.lock', {
							tid: tid
						}, Topics.lock);
					} else {
						socket.emit('topics.unlock', {
							tid: tid
						}, Topics.unlock);
					}
					break;

				case 'delete':
					if (!$this.hasClass('active')) {
						socket.emit('topics.delete', {
							tid: tid
						}, Topics.setDeleted);
					} else {
						socket.emit('topics.restore', {
							tid: tid
						}, Topics.restore);
					}
					break;

			}
		});

		loadMoreEl.addEventListener('click', function() {
			if (this.className.indexOf('disabled') === -1) {
				var topics = document.querySelectorAll('.topics li[data-tid]');

				if(!topics.length) {
					return;
				}

				var lastTid = parseInt(topics[topics.length - 1].getAttribute('data-tid'));

				this.innerHTML = '<i class="fa fa-refresh fa-spin"></i> Retrieving topics';
				socket.emit('admin.topics.getMore', {
					limit: 10,
					after: lastTid
				}, function(topics) {
					var btnEl = document.getElementById('topics_loadmore');

					topics = JSON.parse(topics);
					if (topics.length > 0) {
						var html = templates.prepare(templates['admin/topics'].blocks['topics']).parse({
								topics: topics
							}),
							topicsListEl = document.querySelector('.topics');

						// Fix relative paths
						html = html.replace(/\{relative_path\}/g, RELATIVE_PATH);

						topicsListEl.innerHTML += html;

						Topics.resolveButtonStates();

						btnEl.innerHTML = 'Load More Topics';
						$('span.timeago').timeago();
					} else {
						// Exhausted all topics
						btnEl.className += ' disabled';
						btnEl.innerHTML = 'No more topics';
					}
				});
			}
		}, false);
	};

	Topics.resolveButtonStates = function() {
		// Resolve proper button state for all topics
		var topicsListEl = document.querySelector('.topics'),
			topicEls = topicsListEl.querySelectorAll('li'),
			numTopics = topicEls.length;
		for (var x = 0; x < numTopics; x++) {
			if (topicEls[x].getAttribute('data-pinned') === '1') {
				topicEls[x].querySelector('[data-action="pin"]').className += ' active';
				topicEls[x].removeAttribute('data-pinned');
			}
			if (topicEls[x].getAttribute('data-locked') === '1') {
				topicEls[x].querySelector('[data-action="lock"]').className += ' active';
				topicEls[x].removeAttribute('data-locked');
			}
			if (topicEls[x].getAttribute('data-deleted') === '1') {
				topicEls[x].querySelector('[data-action="delete"]').className += ' active';
				topicEls[x].removeAttribute('data-deleted');
			}
		}
	}

	Topics.setDeleted = function(response) {
		if (response.status === 'ok') {
			var btnEl = document.querySelector('li[data-tid="' + response.tid + '"] button[data-action="delete"]');

			$(btnEl).addClass('active');
			$(btnEl).siblings('[data-action="lock"]').addClass('active');
		}
	};

	Topics.restore = function(response) {
		if (response.status === 'ok') {
			var btnEl = document.querySelector('li[data-tid="' + response.tid + '"] button[data-action="delete"]');

			$(btnEl).removeClass('active');
			$(btnEl).siblings('[data-action="lock"]').removeClass('active');
		}
	};

	Topics.lock = function(response) {
		if (response.status === 'ok') {
			var btnEl = document.querySelector('li[data-tid="' + response.tid + '"] button[data-action="lock"]');

			$(btnEl).addClass('active');
		}
	};

	Topics.unlock = function(response) {
		if (response.status === 'ok') {
			var btnEl = document.querySelector('li[data-tid="' + response.tid + '"] button[data-action="lock"]');

			$(btnEl).removeClass('active');
		}
	};


	Topics.unpin = function(response) {
		if (response.status === 'ok') {
			var btnEl = document.querySelector('li[data-tid="' + response.tid + '"] button[data-action="pin"]');

			$(btnEl).removeClass('active');
		}
	};

	Topics.pin = function(response) {
		if (response.status === 'ok') {
			var btnEl = document.querySelector('li[data-tid="' + response.tid + '"] button[data-action="pin"]');

			$(btnEl).addClass('active');
		}
	};

	return Topics;
});