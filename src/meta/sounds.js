'use strict';

var path = require('path');
var fs = require('fs');
var nconf = require('nconf');
var winston = require('winston');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var async = require('async');

var file = require('../file');
var plugins = require('../plugins');
var db = require('../database');

module.exports = function (Meta) {

	Meta.sounds = {};

	Meta.sounds.init = function (callback) {
		if (nconf.get('isPrimary') === 'true') {
			setupSounds(callback);
		} else {
			if (typeof callback === 'function') {
				callback();
			}
		}
	};

	Meta.sounds.getFiles = function (callback) {
		async.waterfall([
			function (next) {
				fs.readdir(path.join(__dirname, '../../build/public/sounds'), next);
			},
			function (sounds, next) {
				fs.readdir(path.join(nconf.get('upload_path'), 'sounds'), function (err, uploaded) {
					if (err) {
						if (err.code === 'ENOENT') {
							return next(null, sounds);
						}
						return next(err);
					}
					next(null, sounds.concat(uploaded));
				});
			}
		], function (err, files) {
			if (err) {
				winston.error('Could not get local sound files:' + err.message);
				console.log(err.stack);
				return callback(null, []);
			}

			var	localList = {};

			// Filter out hidden files
			files = files.filter(function (filename) {
				return !filename.startsWith('.');
			});

			// Return proper paths
			files.forEach(function (filename) {
				localList[filename] = nconf.get('relative_path') + '/assets/sounds/' + filename;
			});

			callback(null, localList);
		});
	};

	Meta.sounds.getMapping = function (uid, callback) {
		var user = require('../user');
		async.parallel({
			defaultMapping: function (next) {
				db.getObject('settings:sounds', next);
			},
			userSettings: function (next) {
				user.getSettings(uid, next);
			}
		}, function (err, results) {
			if (err) {
				return callback(err);
			}
			var userSettings = results.userSettings;
			var defaultMapping = results.defaultMapping || {};
			var soundMapping = {};
			soundMapping.notification = (userSettings.notificationSound || userSettings.notificationSound === '') ?
				userSettings.notificationSound : defaultMapping.notification || '';

			soundMapping['chat-incoming'] = (userSettings.incomingChatSound || userSettings.incomingChatSound === '') ?
				userSettings.incomingChatSound : defaultMapping['chat-incoming'] || '';

			soundMapping['chat-outgoing'] = (userSettings.outgoingChatSound || userSettings.outgoingChatSound === '') ?
				userSettings.outgoingChatSound : defaultMapping['chat-outgoing'] || '';

			callback(null, soundMapping);
		});
	};

	function setupSounds(callback) {
		var	soundsPath = path.join(__dirname, '../../build/public/sounds');

		async.waterfall([
			function (next) {
				fs.readdir(path.join(nconf.get('upload_path'), 'sounds'), function (err, files) {
					if (err) {
						if (err.code === 'ENOENT') {
							return next(null, []);
						}
						return next(err);
					}

					next(null, files);
				});
			},
			function (uploaded, next) {
				uploaded = uploaded.filter(function (filename) {
					return !filename.startsWith('.');
				}).map(function (filename) {
					return path.join(nconf.get('upload_path'), 'sounds', filename);
				});

				plugins.fireHook('filter:sounds.get', uploaded, function (err, filePaths) {
					if (err) {
						winston.error('Could not initialise sound files:' + err.message);
						return;
					}

					// Clear the sounds directory
					async.series([
						function (next) {
							rimraf(soundsPath, next);
						},
						function (next) {
							mkdirp(soundsPath, next);
						}
					], function (err) {
						if (err) {
							winston.error('Could not initialise sound files:' + err.message);
							return;
						}

						// Link paths
						async.each(filePaths, function (filePath, next) {
							file.link(filePath, path.join(soundsPath, path.basename(filePath)), next);
						}, function (err) {
							if (!err) {
								winston.verbose('[sounds] Sounds OK');
							} else {
								winston.error('[sounds] Could not initialise sounds: ' + err.message);
							}

							if (typeof next === 'function') {
								next();
							}
						});
					});
				});
			}
		], callback);
	}
};