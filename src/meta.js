var utils = require('./../public/src/utils.js'),
	RDB = require('./redis.js'),
	async = require('async'),
	path = require('path'),
	fs = require('fs');

(function(Meta) {
	Meta.config = {
		get: function(callback) {
			var config = {};

			async.waterfall([
				function(next) {
					RDB.hkeys('config', function(err, keys) {
						next(err, keys);
					});
				},
				function(keys, next) {
					async.each(keys, function(key, next) {
						RDB.hget('config', key, function(err, value) {
							if (!err) {
								config[key] = value;
							}

							next(err);
						});
					}, next);
				}
			], function(err) {
				if (!err) {
					config.status = 'ok';
					callback(config);
				} else callback({
					status: 'error'
				});
			});
		},
		set: function(field, value, callback) {
			RDB.hset('config', field, value, function(err, res) {
				callback(err);
			});
		},
		remove: function(field) {
			RDB.hdel('config', field);
		}
	}

	Meta.themes = {
		get: function(callback) {
			var	themePath = path.join(__dirname, '../', 'public/themes');
			fs.readdir(themePath, function(err, files) {
				var themeArr = [];
				async.each(files, function(file, next) {
					fs.lstat(path.join(themePath, file), function(err, stats) {
						if(stats.isDirectory()) {
							var	themeDir = file,
								themeConfPath = path.join(themePath, themeDir, 'theme.json');

							fs.exists(themeConfPath, function(exists) {
								if (exists) {
									fs.readFile(themeConfPath, function(err, conf) {
										conf = JSON.parse(conf);
										conf.src = global.nconf.get('url') + 'themes/' + themeDir + '/' + conf.src;
										if (conf.screenshot) conf.screenshot = global.nconf.get('url') + 'themes/' + themeDir + '/' + conf.screenshot;
										else conf.screenshot = global.nconf.get('url') + 'images/themes/default.png';
										themeArr.push(conf);
										next();
									});
								}
							});
						} else next();
					});
				}, function(err) {
					callback(err, themeArr);
				});
			});
		},
		saveViaGithub: function(repo_url, callback) {
			// ...
		}
	}

	Meta.build_title = function(title, current_user, callback) {
		var user = require('./user');

		if (!title) title = global.config.title || 'NodeBB';
		else title += ' | ' + global.config.title || 'NodeBB';

		// Grab the number of unread notifications
		user.notifications.getUnreadCount(current_user, function(err, count) {
			if (!err && count > 0) title = '(' + count + ') ' + title;

			callback(err, title);
		});
	}
}(exports));