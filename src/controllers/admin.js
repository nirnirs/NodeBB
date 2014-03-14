"use strict";

var async = require('async'),

	user = require('../user'),
	categories = require('../categories'),
	topics = require('../topics'),
	meta = require('../meta'),
	db = require('../database'),
	events = require('../events'),
	languages = require('../languages'),
	plugins = require('../plugins'),
	widgets = require('../widgets'),
	groups = require('../groups'),
	pkg = require('../../package.json'),
	validator = require('validator');



var adminController = {
	categories: {},
	topics: {},
	groups: {},
	themes: {},
	events: {},
	database: {},
	plugins: {},
	languages: {},
	settings: {},
	logger: {},
	users: require('./admin/users'),
	uploads: require('./admin/uploads')
};

adminController.home = function(req, res, next) {
	res.render('admin/index', {
		version: pkg.version,
		emailerInstalled: plugins.hasListeners('action:email.send'),
		searchInstalled: plugins.hasListeners('filter:search.query')
	});
};

adminController.categories.active = function(req, res, next) {
	filterAndRenderCategories(req, res, next, true);
};

adminController.categories.disabled = function(req, res, next) {
	filterAndRenderCategories(req, res, next, false);
};

function filterAndRenderCategories(req, res, next, active) {
	categories.getAllCategories(0, function (err, data) {
		data.categories = data.categories.filter(function (category) {
			return active ? !category.disabled : category.disabled;
		});

		data.categories.forEach(function(category) {
			category.description = validator.escape(category.description);
		});

		res.render('admin/categories', data);
	});
}

adminController.database.get = function(req, res, next) {
	db.info(function (err, data) {
		res.render('admin/database', data);
	});
};

// todo: deprecate this seemingly useless view
adminController.topics.get = function(req, res, next) {
	topics.getAllTopics(0, 19, function (err, topics) {
		res.render('admin/topics', {
			topics: topics,
			notopics: topics.length === 0
		});
	});
};

adminController.events.get = function(req, res, next) {
	events.getLog(function(err, data) {
		if(err || !data) {
			return next(err);
		}

		data = data.toString().split('\n').reverse().join('\n');
		res.render('admin/events', {
			eventdata: data
		});
	});
};

adminController.plugins.get = function(req, res, next) {
	plugins.showInstalled(function (err, plugins) {
		if (err || !Array.isArray(plugins)) {
			plugins = [];
		}

		res.render('admin/plugins', {
			plugins: plugins
		});
	});
};

adminController.languages.get = function(req, res, next) {
	languages.list(function(err, languages) {
		res.render('admin/languages', {
			languages: languages
		});
	});
};

adminController.settings.get = function(req, res, next) {
	meta.sounds.getLocal(function(err, sounds) {
		// There has GOT to be a better way!
		sounds = Object.keys(sounds).map(function(name) {
			return {
				name: name
			};
		});

		res.render('admin/settings', {
			sounds: sounds
		});
	});
};

adminController.logger.get = function(req, res, next) {
	res.render('admin/logger', {});
};

adminController.themes.get = function(req, res, next) {
	async.parallel({
		areas: function(next) {
			plugins.fireHook('filter:widgets.getAreas', [], next);
		},
		widgets: function(next) {
			plugins.fireHook('filter:widgets.getWidgets', [], next);
		}
	}, function(err, widgetData) {
		async.each(widgetData.areas, function(area, next) {
			widgets.getArea(area.template, area.location, function(err, areaData) {
				area.data = areaData;
				next(err);
			});
		}, function(err) {
			for (var w in widgetData.widgets) {
				if (widgetData.widgets.hasOwnProperty(w)) {
					widgetData.widgets[w].content += "<br /><label>Title:</label><input type=\"text\" class=\"form-control\" name=\"title\" placeholder=\"Title (only shown on some containers)\" /><br /><label>Container:</label><textarea rows=\"4\" class=\"form-control container-html\" name=\"container\" placeholder=\"Drag and drop a container or enter HTML here.\"></textarea>";
				}
			}

			res.render('admin/themes', {
				areas: widgetData.areas,
				widgets: widgetData.widgets
			});
		});
	});
};

adminController.groups.get = function(req, res, next) {
	async.parallel([
		function(next) {
			groups.list({
				expand: true
			}, next);
		},
		function(next) {
			groups.listSystemGroups({
				expand: true
			}, next);
		}
	], function(err, groupData) {
		var	groups = groupData[0].concat(groupData[1]);

		res.render('admin/groups', {
			groups: groups,
			yourid: req.user.uid
		});
	});
};

module.exports = adminController;