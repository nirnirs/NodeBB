define(['composer', 'forum/pagination'], function(composer, pagination) {
	var Category = {},
		loadingMoreTopics = false;

	Category.init = function() {
		var	cid = templates.get('category_id');

		app.enterRoom('category_' + cid);

		$('#twitter-share').on('click', function () {
			window.open('https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(templates.get('category_name')), '_blank', 'width=550,height=420,scrollbars=no,status=no');
			return false;
		});

		$('#facebook-share').on('click', function () {
			window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href), '_blank', 'width=626,height=436,scrollbars=no,status=no');
			return false;
		});

		$('#google-share').on('click', function () {
			window.open('https://plus.google.com/share?url=' + encodeURIComponent(window.location.href), '_blank', 'width=500,height=570,scrollbars=no,status=no');
			return false;
		});

		$('#new_post').on('click', function () {
			composer.newTopic(cid);
		});

		ajaxify.register_events([
			'event:new_topic'
		]);

		socket.on('event:new_topic', Category.onNewTopic);

		enableInfiniteLoading();

		$('#topics-container').on('click', '.topic-title', function() {
			var clickedTid = $(this).parents('li.category-item[data-tid]').attr('data-tid');
			$('#topics-container li.category-item').each(function(index, el) {
				if($(el).offset().top - $(window).scrollTop() > 0) {
					localStorage.setItem('category:bookmark', $(el).attr('data-tid'));
					localStorage.setItem('category:bookmark:clicked', clickedTid);
					return false;
				}
			});
		});
	};

	$(window).on('action:popstate', function(ev, data) {
		if(data.url.indexOf('category/') === 0) {
			var bookmark = localStorage.getItem('category:bookmark');
			var clicked = localStorage.getItem('category:bookmark:clicked');

			if (bookmark) {

				if(config.usePagination) {
					socket.emit('topics.getTidPage', bookmark, function(err, page) {
						if(err) {
							return;
						}
						if(parseInt(page, 10) !== pagination.currentPage) {
							pagination.loadPage(page);
						} else {
							Category.scrollToTopic(bookmark, clicked, 400);
						}
					});
				} else {

					socket.emit('topics.getTidIndex', bookmark, function(err, index) {
						if(err) {
							return;
						}

						if(index === 0) {
							Category.highlightTopic(clicked);
							return;
						}

						if (index < 0) {
							index = 0;
						}

						$('#topics-container').empty();
						loadingMoreTopics = false;

						Category.loadMoreTopics(templates.get('category_id'), index, function() {
							Category.scrollToTopic(bookmark, clicked, 0);
						});
					});
				}
			}
		}
	});

	Category.highlightTopic = function(tid) {
		var highlight = $('#topics-container li.category-item[data-tid="' + tid + '"]');
		if(highlight.length && !highlight.hasClass('highlight')) {
			highlight.addClass('highlight');
			setTimeout(function() {
				highlight.removeClass('highlight');
			}, 5000);
		}
	};

	Category.scrollToTopic = function(tid, clickedTid, duration, offset) {
		if(!tid) {
			return;
		}

		if(!offset) {
			offset = 0;
		}

		if($('#topics-container li.category-item[data-tid="' + tid + '"]').length) {
			var	cid = templates.get('category_id');
			var scrollTo = $('#topics-container li.category-item[data-tid="' + tid + '"]');

			if (cid && scrollTo.length) {
				$('html, body').animate({
					scrollTop: (scrollTo.offset().top - $('#header-menu').height() - offset) + 'px'
				}, duration !== undefined ? duration : 400, function() {
					Category.highlightTopic(clickedTid);
				});
			}
		}
	};

	function enableInfiniteLoading() {
		if(!config.usePagination) {
			app.enableInfiniteLoading(function(direction) {

				if(!loadingMoreTopics && $('#topics-container').children().length) {

					var after = 0,
						offset = 0,
						el = null;

					if(direction > 0) {
						el = $('#topics-container .category-item[data-tid]').last();
						after = parseInt(el.attr('data-index'), 10) + 1;
					} else {
						el = $('#topics-container .category-item[data-tid]').first();
						after = parseInt(el.attr('data-index'), 10);
						after -= config.topicsPerPage;
						if(after < 0) {
							after = 0;
						}
						offset = el.offset().top - $('#header-menu').offset().top + $('#header-menu').height();
					}

					Category.loadMoreTopics(templates.get('category_id'), after, function() {
						if(direction < 0 && el) {
							Category.scrollToTopic(el.attr('data-tid'), null, 0, offset);
						}
					});
				}
			});
		} else {
			pagination.init(templates.get('currentPage'), templates.get('pageCount'));
		}
	}

	Category.onNewTopic = function(data) {
		$(window).trigger('filter:categories.new_topic', data);

		var html = templates.prepare(templates['category'].blocks['topics']).parse({
			topics: [data]
		});

		translator.translate(html, function(translatedHTML) {
			var topic = $(translatedHTML),
				container = $('#topics-container'),
				topics = $('#topics-container').children('.category-item'),
				numTopics = topics.length;

			$('#topics-container, .category-sidebar').removeClass('hidden');
			$('#category-no-topics').remove();

			if (numTopics > 0) {
				for (var x = 0; x < numTopics; x++) {
					if ($(topics[x]).find('.fa-thumb-tack').length) {
						if(x === numTopics - 1) {
							topic.insertAfter(topics[x]);
						}
						continue;
					}
					topic.insertBefore(topics[x]);
					break;
				}
			} else {
				container.append(topic);
			}

			topic.hide().fadeIn('slow');

			socket.emit('categories.getPageCount', templates.get('category_id'), function(err, newPageCount) {
				pagination.recreatePaginationLinks(newPageCount);
			});

			topic.find('span.timeago').timeago();
			app.createUserTooltips();

			$(window).trigger('action:categories.new_topic.loaded');
		});
	};

	Category.onTopicsLoaded = function(topics, callback) {
		if(!topics || !topics.length) {
			return;
		}

		function removeAlreadyAddedTopics() {
			topics = topics.filter(function(topic) {
				return $('#topics-container li[data-tid="' + topic.tid +'"]').length === 0;
			});
		}

		var after = null,
			before = null;

		function findInsertionPoint() {
			if (!$('#topics-container .category-item[data-tid]').length) {
				return;
			}
			var last = $('#topics-container .category-item[data-tid]').last();
			var lastIndex = last.attr('data-index');
			var firstIndex = topics[topics.length - 1].index;
			if (firstIndex > lastIndex) {
				after = last;
			} else {
				before = $('#topics-container .category-item[data-tid]').first();
			}
		}

		removeAlreadyAddedTopics();
		if(!topics.length) {
			return;
		}

		findInsertionPoint();

		var html = templates.prepare(templates['category'].blocks['topics']).parse({
			topics: topics
		});

		translator.translate(html, function(translatedHTML) {
			var container = $('#topics-container'),
				html = $(translatedHTML);

			$('#topics-container, .category-sidebar').removeClass('hidden');
			$('#category-no-topics').remove();

			if(config.usePagination) {
				container.empty().append(html);
			} else {
				if(after) {
					html.insertAfter(after);
				} else if(before) {
					html.insertBefore(before);
				} else {
					container.append(html);
				}
			}

			html.find('span.timeago').timeago();
			app.createUserTooltips();
			app.makeNumbersHumanReadable(html.find('.human-readable-number'));

			if (typeof callback === 'function') {
				callback(topics);
			}
		});
	};

	Category.loadMoreTopics = function(cid, after, callback) {
		if (loadingMoreTopics || !$('#topics-container').length) {
			return;
		}

		if(after === 0 && $('#topics-container li.category-item[data-index="0"]').length) {
			return;
		}

		$(window).trigger('action:categories.loading');
		loadingMoreTopics = true;

		socket.emit('categories.loadMore', {
			cid: cid,
			after: after
		}, function (err, data) {
			loadingMoreTopics = false;

			if(err) {
				return app.alertError(err.message);
			}

			if (data && data.topics.length) {
				Category.onTopicsLoaded(data.topics, callback);
				$('#topics-container').attr('data-nextstart', data.nextStart);
			} else {

				if (typeof callback === 'function') {
					callback(data.topics);
				}
			}


			$(window).trigger('action:categories.loaded');
		});
	};

	return Category;
});