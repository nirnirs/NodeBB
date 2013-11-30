"use strict";

var	nconf = require('nconf'),
	path = require('path'),
	fs = require('fs'),
	validator = require('validator'),
	plugins = require('../plugins'),

	PluginRoutes = function(app) {
		app.get('/plugins/fireHook', function(req, res) {
			// GET = filter
			Plugins.fireHook('filter:' + req.query.hook, req.query.args, function(err, returnData) {
				if (typeof returnData === 'object') {
					res.json(200, returnData);
				} else {
					res.send(200, validator.sanitize(returnData).escape());
				}
			});
		});

		app.put('/plugins/fireHook', function(req, res) {
			// PUT = action
			plugins.fireHook('action:' + req.body.hook, req.body.args);
			res.send(200);
		});

		// Static Assets
		app.get('/plugins/:id/*', function(req, res) {
			var	relPath = req.url.replace('/plugins/' + req.params.id, '');
			if (plugins.staticDirs[req.params.id]) {
				var	fullPath = path.join(plugins.staticDirs[req.params.id], relPath);
				fs.exists(fullPath, function(exists) {
					if (exists) {
						res.sendfile(fullPath, {
							maxAge: app.enabled('cache') ? 5184000000 : 0
						});
					} else {
						res.redirect('/404');
					}
				});
			} else {
				res.redirect('/404');
			}
		});
	};

module.exports = PluginRoutes;