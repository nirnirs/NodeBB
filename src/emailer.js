"use strict";

var	fs = require('fs'),
	async = require('async'),
	path = require('path'),
	winston = require('winston'),
	templates = require('templates.js'),

	User = require('./user'),
	Plugins = require('./plugins'),
	meta = require('./meta'),
	translator = require('../public/src/translator'),

	app;

(function(Emailer) {
	Emailer.registerApp = function(expressApp) {
		app = expressApp;
		return Emailer;
	};

	Emailer.send = function(template, uid, params) {
		if (!app) {
			winston.warn('[emailer] App not ready!');
			return;
		}

		async.parallel({
			html: function(next) {
				app.render('emails/' + template, params, next);
			},
			plaintext: function(next) {
				app.render('emails/' + template + '_plaintext', params, next);
			},
			email: async.apply(User.getUserField, uid, 'email'),
			settings: async.apply(User.getSettings, uid)
		}, function(err, results) {
			if (err) {
				return winston.error('[emailer] Error sending digest : ' + err.stack);
			}
			async.map([results.html, results.plaintext, params.subject], function(raw, next) {
				translator.translate(raw, results.settings.language || meta.config.defaultLang || 'en_GB', function(translated) {
					next(undefined, translated);
				});
			}, function(err, translated) {
				if (err) {
					return winston.error(err.message);
				} else if (!results.email) {
					return winston.warn('uid : ' + uid + ' has no email, not sending.');
				}

				if (Plugins.hasListeners('action:email.send')) {
					Plugins.fireHook('action:email.send', {
						to: results.email,
						from: meta.config['email:from'] || 'no-reply@localhost.lan',
						subject: translated[2],
						html: translated[0],
						plaintext: translated[1],
						template: template,
						uid: uid
					});
				} else {
					winston.warn('[emailer] No active email plugin found!');
				}
			});
		});
	};
}(module.exports));

