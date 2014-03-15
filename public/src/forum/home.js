'use strict';

/* globals define, socket, app, templates, translator*/

define(function() {
	var	home = {};

	$(window).on('action:ajaxify.start', function(ev, data) {
		if (data.url !== '') {
			socket.removeListener('event:new_post', home.onNewPost);
		}
	});


	home.init = function() {
		app.enterRoom('home');

		socket.on('event:new_post', home.onNewPost);
	};

	home.onNewPost = function(data) {

		if (data && data.posts && data.posts.length) {

			socket.emit('posts.getCategory', data.posts[0].pid, function(err, cid) {
				if (err) {
					return;
				}

				renderNewPost(cid, data.posts[0]);
			});
		}
	};

	function renderNewPost(cid, post) {
		var category = $('.home .category-item[data-cid="' + cid + '"]');
		var categoryBox = category.find('.category-box');
		var numRecentReplies = category.attr('data-numRecentReplies');
		if (!numRecentReplies) {
			return;
		}

		var recentPosts = categoryBox.find('.post-preview');
		var insertBefore = recentPosts.first();

		parseAndTranslate([post], function(html) {
			html.hide();
			if(recentPosts.length === 0) {
				html.appendTo(categoryBox);
			} else {
				html.insertBefore(recentPosts.first());
			}

			html.fadeIn();

			app.createUserTooltips();

			if (categoryBox.find('.post-preview').length > parseInt(numRecentReplies, 10)) {
				recentPosts.last().remove();
			}
		});
	}

	function parseAndTranslate(posts, callback) {
		templates.preload_template('home', function() {

			templates.home.parse({
				categories: {
					posts: []
				}
			});

			var html = templates.prepare(templates.home.blocks['categories.posts']).parse({
				categories: {
					posts: posts
				}
			});

			translator.translate(html, function(translatedHTML) {
				translatedHTML = $(translatedHTML);
				translatedHTML.find('img').addClass('img-responsive');
				translatedHTML.find('span.timeago').timeago();
				callback(translatedHTML);
			});
		});
	}

	return home;
});
