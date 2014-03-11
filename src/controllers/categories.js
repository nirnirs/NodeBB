"use strict";

var categoriesController = {},
	async = require('async'),
	qs = require('querystring'),
	nconf = require('nconf'),
	categoryTools = require('./../categoryTools'),
	user = require('./../user'),
	categories = require('./../categories'),
	topics = require('./../topics');

categoriesController.recent = function(req, res, next) {
	var uid = (req.user) ? req.user.uid : 0;
	topics.getLatestTopics(uid, 0, 19, req.params.term, function (err, data) {
		if(err) {
			return next(err);
		}

		res.render('recent', data);
	});
};

categoriesController.popular = function(req, res, next) {
	var uid = (req.user) ? req.user.uid : 0;
	var set = 'topics:' + req.params.set;
	if(!req.params.set) {
		set = 'topics:posts';
	}

	topics.getTopicsFromSet(uid, set, 0, 19, function(err, data) {
		if(err) {
			return next(err);
		}

		res.render('popular', data);
	});
};

categoriesController.unread = function(req, res, next) {
	var uid = req.user.uid;

	topics.getUnreadTopics(uid, 0, 19, function (err, data) {
		if(err) {
			return next(err);
		}

		res.render('unread', data);
	});
};

categoriesController.unreadTotal = function(req, res, next) {
	var uid = req.user.uid;

	topics.getTotalUnread(uid, function (err, data) {
		if(err) {
			return next(err);
		}

		res.render('unread', data);
	});
};

categoriesController.get = function(req, res, next) {
	var cid = req.params.category_id,
		page = req.query.page || 1,
		uid = req.user ? req.user.uid : 0;

	async.waterfall([
		function(next) {
			categoryTools.privileges(cid, uid, function(err, categoryPrivileges) {
				if (!err) {
					if (!categoryPrivileges.read) {
						next(new Error('not-enough-privileges'));
					} else {
						next(null, categoryPrivileges);
					}
				} else {
					next(err);
				}
			});
		},
		function (privileges, next) {
			user.getSettings(uid, function(err, settings) {
				if (err) {
					return next(err);
				}

				var start = (page - 1) * settings.topicsPerPage,
					end = start + settings.topicsPerPage - 1;

				categories.getCategoryById(cid, start, end, uid, function (err, categoryData) {
					if (categoryData) {
						if (parseInt(categoryData.disabled, 10) === 1) {
							return next(new Error('Category disabled'), null);
						}
					}

					categoryData.privileges = privileges;
					next(err, categoryData);
				});
			});
		},
		function (categoryData, next) {
			res.locals.metaTags = [
				{
					name: 'title',
					content: categoryData.name
				},
				{
					property: 'og:title',
					content: categoryData.name
				},
				{
					name: 'description',
					content: categoryData.description
				},
				{
					property: "og:type",
					content: 'website'
				}
			];

			res.locals.linkTags = [
				{
					rel: 'alternate',
					type: 'application/rss+xml',
					href: nconf.get('url') + '/category/' + cid + '.rss'
				},
				{
					rel: 'up',
					href: nconf.get('url')
				}
			];

			next(null, categoryData);
		}
	], function (err, data) {
		if (err) {
			if (err.message === 'not-enough-privileges') {
				return res.redirect('403');
			} else {
				return res.redirect('404');
			}
		}

		if(data.link) {
			return res.redirect(data.link);
		}

		var category_url = cid + (req.params.slug ? '/' + req.params.slug : '');
		var queryString = qs.stringify(req.query);
		if(queryString.length) {
			category_url += '?' + queryString;
		}

		data.currentPage = page;

		// Paginator for noscript
		data.pages = [];
		for(var x=1;x<=data.pageCount;x++) {
			data.pages.push({
				page: x,
				active: x === parseInt(page, 10)
			});
		}

		res.render('category', data);
	});
};

module.exports = categoriesController;