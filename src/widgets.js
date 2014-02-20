var async = require('async'),
	winston = require('winston'),
	plugins = require('./plugins'),
	db = require('./database');


(function(Widgets) {

	Widgets.render = function(uid, area, callback) {
		if (!area.location || !area.template) {
			callback({
				error: 'Missing location and template data'
			});
		}

		var rendered = [];

		Widgets.getArea(area.template, area.location, function(err, widgets) {
			async.eachSeries(widgets, function(widget, next) {
				plugins.fireHook('filter:widget.render:' + widget.widget, {
					uid: uid,
					area: area,
					data: widget.data
				}, function(err, data){
					rendered.push({
						html: data.html,
						title: data.title
					});

					next(err);
				});
			}, function(err) {
				callback(err, rendered);
			});
		});
	};

	Widgets.getArea = function(template, location, callback) {
		db.getObjectField('widgets:' + template, location, function(err, widgets) {
			if (!widgets) {
				return callback(err, []);
			}
			callback(err, JSON.parse(widgets));
		})
	};

	Widgets.setArea = function(area, callback) {
		if (!area.location || !area.template) {
			callback({
				error: 'Missing location and template data'
			});
		}
		
		db.setObjectField('widgets:' + area.template, area.location, JSON.stringify(area.widgets), function(err) {
			callback(err);
		});
	};

}(exports));