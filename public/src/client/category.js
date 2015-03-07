"use strict";
/* global define, config, templates, app, utils, ajaxify, socket, translator */

define('forum/category', [
	'composer',
	'forum/pagination',
	'forum/infinitescroll',
	'share',
	'navigator',
	'forum/categoryTools',
	'sort'
], function(composer, pagination, infinitescroll, share, navigator, categoryTools, sort) {
	var Category = {};

	$(window).on('action:ajaxify.start', function(ev, data) {
		if (ajaxify.currentPage !== data.url) {
			navigator.hide();

			removeListeners();
		}
	});

	$(window).on('action:composer.topics.post', function(ev, data) {
		localStorage.removeItem('category:' + data.data.cid + ':bookmark');
		localStorage.removeItem('category:' + data.data.cid + ':bookmark:clicked');
		ajaxify.go('topic/' + data.data.slug);
	});

	function removeListeners() {
		socket.removeListener('event:new_topic', Category.onNewTopic);
		categoryTools.removeListeners();
	}

	Category.init = function() {
		var	cid = ajaxify.variables.get('category_id');

		app.enterRoom('category_' + cid);

		share.addShareHandlers(ajaxify.variables.get('category_name'));

		$('#new_post').on('click', function () {
			composer.newTopic(cid);
		});

		socket.removeListener('event:new_topic', Category.onNewTopic);
		socket.on('event:new_topic', Category.onNewTopic);

		categoryTools.init(cid);

		sort.handleSort('categoryTopicSort', 'user.setCategorySort', 'category/' + ajaxify.variables.get('category_slug'));

		enableInfiniteLoadingOrPagination();

		if (!config.usePagination) {
			navigator.init('#topics-container > .category-item', ajaxify.variables.get('topic_count'), Category.toTop, Category.toBottom, Category.navigatorCallback);
		}

		$('#topics-container').on('click', '.topic-title', function() {
			var clickedIndex = $(this).parents('[data-index]').attr('data-index');
			$('#topics-container li.category-item').each(function(index, el) {
				if ($(el).offset().top - $(window).scrollTop() > 0) {
					localStorage.setItem('category:' + cid + ':bookmark', $(el).attr('data-index'));
					localStorage.setItem('category:' + cid + ':bookmark:clicked', clickedIndex);
					return false;
				}
			});
		});

		handleIgnoreWatch(cid);
	};

	function handleIgnoreWatch(cid) {
		$('.watch, .ignore').on('click', function() {
			var $this = $(this);
			var command = $this.hasClass('watch') ? 'watch' : 'ignore';

			socket.emit('categories.' + command, cid, function(err) {
				if (err) {
					return app.alertError(err.message);
				}

				$('.watch').toggleClass('hidden', command === 'watch');
				$('.ignore').toggleClass('hidden', command === 'ignore');
			});
		});
	}

	Category.toTop = function() {
		navigator.scrollTop(0);
	};

	Category.toBottom = function() {
		socket.emit('categories.getTopicCount', ajaxify.variables.get('category_id'), function(err, count) {
			navigator.scrollBottom(count - 1);
		});
	};

	Category.navigatorCallback = function(element, elementCount) {
		return parseInt(element.attr('data-index'), 10) + 1;
	};

	$(window).on('action:popstate', function(ev, data) {
		if (data.url.indexOf('category/') === 0) {
			var cid = data.url.match(/^category\/(\d+)/);
			if (cid && cid[1]) {
				cid = cid[1];
			}
			if (!cid) {
				return;
			}

			var bookmarkIndex = localStorage.getItem('category:' + cid + ':bookmark');
			var clickedIndex = localStorage.getItem('category:' + cid + ':bookmark:clicked');

			if (!bookmarkIndex) {
				return;
			}

			if (config.usePagination) {
				var page = Math.ceil((parseInt(bookmarkIndex, 10) + 1) / config.topicsPerPage);
				if (parseInt(page, 10) !== pagination.currentPage) {
					pagination.loadPage(page, function() {
						Category.scrollToTopic(bookmarkIndex, clickedIndex, 400);
					});
				} else {
					Category.scrollToTopic(bookmarkIndex, clickedIndex, 400);
				}
			} else {
				if (bookmarkIndex === 0) {
					Category.highlightTopic(clickedIndex);
					return;
				}

				if (bookmarkIndex < 0) {
					bookmarkIndex = 0;
				}

				$('#topics-container').empty();

				loadTopicsAfter(bookmarkIndex, function() {
					Category.scrollToTopic(bookmarkIndex, clickedIndex, 0);
				});
			}
		}
	});

	Category.highlightTopic = function(topicIndex) {
		var highlight = $('#topics-container [data-index="' + topicIndex + '"]');
		if (highlight.length && !highlight.hasClass('highlight')) {
			highlight.addClass('highlight');
			setTimeout(function() {
				highlight.removeClass('highlight');
			}, 5000);
		}
	};

	Category.scrollToTopic = function(bookmarkIndex, clickedIndex, duration, offset) {
		if (!bookmarkIndex) {
			return;
		}

		if (!offset) {
			offset = 0;
		}

		var scrollTo = $('#topics-container [data-index="' + bookmarkIndex + '"]');
		var	cid = ajaxify.variables.get('category_id');
		if (scrollTo.length && cid) {
			$('html, body').animate({
				scrollTop: (scrollTo.offset().top - $('#header-menu').height() - offset) + 'px'
			}, duration !== undefined ? duration : 400, function() {
				Category.highlightTopic(clickedIndex);
				navigator.update();
			});
		}
	};

	function enableInfiniteLoadingOrPagination() {
		if (!config.usePagination) {
			infinitescroll.init(Category.loadMoreTopics);
		} else {
			navigator.hide();
			pagination.init(ajaxify.variables.get('currentPage'), ajaxify.variables.get('pageCount'));
		}
	}

	Category.onNewTopic = function(topic) {
		var	cid = ajaxify.variables.get('category_id');
		if (!topic || parseInt(topic.cid, 10) !== parseInt(cid, 10)) {
			return;
		}

		$(window).trigger('filter:categories.new_topic', topic);

		templates.parse('category', 'topics', {
			privileges: {editable: !!$('.thread-tools').length},
			topics: [topic]
		}, function(html) {
			translator.translate(html, function(translatedHTML) {
				var topic = $(translatedHTML),
					container = $('#topics-container'),
					topics = $('#topics-container').children('.category-item'),
					numTopics = topics.length;

				$('#topics-container, .category-sidebar').removeClass('hidden');

				var noTopicsWarning = $('#category-no-topics');
				if (noTopicsWarning.length) {
					noTopicsWarning.remove();
					ajaxify.widgets.render('category', window.location.pathname.slice(1));
				}

				if (numTopics > 0) {
					for (var x = 0; x < numTopics; x++) {
						var pinned = $(topics[x]).hasClass('pinned');
						if (pinned) {
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

				topic.find('span.timeago').timeago();
				app.createUserTooltips();
				updateTopicCount();

				$(window).trigger('action:categories.new_topic.loaded');
			});
		});
	};

	function updateTopicCount() {
		socket.emit('categories.getTopicCount', ajaxify.variables.get('category_id'), function(err, topicCount) {
			if(err) {
				return app.alertError(err.message);
			}
			navigator.setCount(topicCount);
		});
	}

	Category.onTopicsLoaded = function(data, callback) {
		if(!data || !data.topics.length) {
			return;
		}

		function removeAlreadyAddedTopics(topics) {
			return topics.filter(function(topic) {
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
			var firstIndex = data.topics[data.topics.length - 1].index;
			if (firstIndex > lastIndex) {
				after = last;
			} else {
				before = $('#topics-container .category-item[data-tid]').first();
			}
		}

		data.topics = removeAlreadyAddedTopics(data.topics);
		if(!data.topics.length) {
			return;
		}

		findInsertionPoint();

		templates.parse('category', 'topics', data, function(html) {
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

				if (typeof callback === 'function') {
					callback();
				}
				html.find('span.timeago').timeago();
				app.createUserTooltips();
				utils.makeNumbersHumanReadable(html.find('.human-readable-number'));
			});
		});
	};

	Category.loadMoreTopics = function(direction) {
		if (!$('#topics-container').length || !$('#topics-container').children().length) {
			return;
		}

		infinitescroll.calculateAfter(direction, '#topics-container .category-item[data-tid]', config.topicsPerPage, false, function(after, offset, el) {
			loadTopicsAfter(after, function() {
				if (direction < 0 && el) {
					Category.scrollToTopic(el.attr('data-index'), null, 0, offset);
				}
			});
		});
	};

	function loadTopicsAfter(after, callback) {
		if(!utils.isNumber(after) || (after === 0 && $('#topics-container li.category-item[data-index="0"]').length)) {
			return;
		}

		$(window).trigger('action:categories.loading');
		infinitescroll.loadMore('categories.loadMore', {
			cid: ajaxify.variables.get('category_id'),
			after: after,
			author: utils.params().author
		}, function (data, done) {

			if (data.topics && data.topics.length) {
				Category.onTopicsLoaded(data, function() {
					done();
					callback();
				});
				$('#topics-container').attr('data-nextstart', data.nextStart);
			} else {
				done();
			}

			$(window).trigger('action:categories.loaded');
		});
	}

	return Category;
});