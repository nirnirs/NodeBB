
'use strict';

var nconf = require('nconf');
var winston = require('winston');
var fs = require('fs');
var path = require('path');
var async = require('async');

var file = require('../file');
var db = require('../database');

module.exports = function (Meta) {
	Meta.themes = {};

	Meta.themes.get = function (callback) {
		var themePath = nconf.get('themes_path');
		if (typeof themePath !== 'string') {
			return callback(null, []);
		}

		fs.readdir(themePath, function (err, files) {
			if (err) {
				return callback(err);
			}

			async.filter(files, function (file, next) {
				fs.stat(path.join(themePath, file), function (err, fileStat) {
					if (err) {
						return next(false);
					}

					next((fileStat.isDirectory() && file.slice(0, 13) === 'nodebb-theme-'));
				});
			}, function (themes) {
				async.map(themes, function (theme, next) {
					var config = path.join(themePath, theme, 'theme.json');

					fs.readFile(config, function (err, file) {
						if (err) {
							return next();
						}
						try {
							var configObj = JSON.parse(file.toString());

							// Minor adjustments for API output
							configObj.type = 'local';
							if (configObj.screenshot) {
								configObj.screenshot_url = nconf.get('relative_path') + '/css/previews/' + configObj.id;
							} else {
								configObj.screenshot_url = nconf.get('relative_path') + '/assets/images/themes/default.png';
							}
							next(null, configObj);
						} catch (err) {
							winston.error('[themes] Unable to parse theme.json ' + theme);
							next(null, null);
						}
					});
				}, function (err, themes) {
					if (err) {
						return callback(err);
					}

					themes = themes.filter(Boolean);
					callback(null, themes);
				});
			});
		});
	};

	Meta.themes.set = function (data, callback) {
		var	themeData = {
			'theme:type': data.type,
			'theme:id': data.id,
			'theme:staticDir': '',
			'theme:templates': '',
			'theme:src': '',
		};

		switch (data.type) {
		case 'local':
			async.waterfall([
				async.apply(Meta.configs.get, 'theme:id'),
				function (current, next) {
					async.series([
						async.apply(db.sortedSetRemove, 'plugins:active', current),
						async.apply(db.sortedSetAdd, 'plugins:active', 0, data.id),
					], function (err) {
						next(err);
					});
				},
				function (next) {
					fs.readFile(path.join(nconf.get('themes_path'), data.id, 'theme.json'), function (err, config) {
						if (!err) {
							config = JSON.parse(config.toString());
							next(null, config);
						} else {
							next(err);
						}
					});
				},
				function (config, next) {
					themeData['theme:staticDir'] = config.staticDir ? config.staticDir : '';
					themeData['theme:templates'] = config.templates ? config.templates : '';
					themeData['theme:src'] = '';

					Meta.configs.setMultiple(themeData, next);

					// Re-set the themes path (for when NodeBB is reloaded)
					Meta.themes.setPath(config);
				},
			], callback);

			Meta.reloadRequired = true;
			break;

		case 'bootswatch':
			Meta.configs.setMultiple({
				'theme:src': data.src,
				bootswatchSkin: data.id.toLowerCase(),
			}, callback);
			break;
		}
	};

	Meta.themes.setupPaths = function (callback) {
		async.parallel({
			themesData: Meta.themes.get,
			currentThemeId: function (next) {
				db.getObjectField('config', 'theme:id', next);
			},
		}, function (err, data) {
			if (err) {
				return callback(err);
			}

			var themeId = data.currentThemeId || 'nodebb-theme-persona';

			var	themeObj = data.themesData.filter(function (themeObj) {
				return themeObj.id === themeId;
			})[0];

			if (process.env.NODE_ENV === 'development') {
				winston.info('[themes] Using theme ' + themeId);
			}

			if (!themeObj) {
				return callback(new Error('[[error:theme-not-found]]'));
			}

			Meta.themes.setPath(themeObj);
			callback();
		});
	};

	Meta.themes.setPath = function (themeObj) {
		// Theme's templates path
		var themePath = nconf.get('base_templates_path');
		var fallback = path.join(nconf.get('themes_path'), themeObj.id, 'templates');

		if (themeObj.templates) {
			themePath = path.join(nconf.get('themes_path'), themeObj.id, themeObj.templates);
		} else if (file.existsSync(fallback)) {
			themePath = fallback;
		}

		nconf.set('theme_templates_path', themePath);
		nconf.set('theme_config', path.join(nconf.get('themes_path'), themeObj.id, 'theme.json'));
	};
};
