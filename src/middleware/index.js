"use strict";

var templates = require('./../../public/src/templates'),
	translator = require('./../../public/src/translator'),
	utils = require('./../../public/src/utils'),
	meta = require('./../meta'),
	db = require('./../database'),
	auth = require('./../routes/authentication'),
	async = require('async'),
	path = require('path'),
	fs = require('fs'),
	nconf = require('nconf'),
	express = require('express'),
	winston = require('winston');


var middleware = {};


function routeThemeScreenshots(app, themes) {
	var	screenshotPath;

	async.each(themes, function(themeObj, next) {
		if (themeObj.screenshot) {
			screenshotPath = path.join(nconf.get('themes_path'), themeObj.id, themeObj.screenshot);
			(function(id, path) {
				fs.exists(path, function(exists) {
					if (exists) {
						app.get('/css/previews/' + id, function(req, res) {
							res.sendfile(path);
						});
					}
				});
			})(themeObj.id, screenshotPath);
		} else {
			next(false);
		}
	});
}

function routeCurrentTheme(app, themeData) {
	var themeId = (themeData['theme:id'] || 'nodebb-theme-vanilla');

	// Detect if a theme has been selected, and handle appropriately
	if (!themeData['theme:type'] || themeData['theme:type'] === 'local') {
		// Local theme
		if (process.env.NODE_ENV === 'development') {
			winston.info('[themes] Using theme ' + themeId);
		}

		// Theme's static directory
		if (themeData['theme:staticDir']) {
			app.use('/css/assets', express.static(path.join(nconf.get('themes_path'), themeData['theme:id'], themeData['theme:staticDir']), {
				maxAge: app.enabled('cache') ? 5184000000 : 0
			}));
			if (process.env.NODE_ENV === 'development') {
				winston.info('Static directory routed for theme: ' + themeData['theme:id']);
			}
		}

		if (themeData['theme:templates']) {
			app.use('/templates', express.static(path.join(nconf.get('themes_path'), themeData['theme:id'], themeData['theme:templates']), {
				maxAge: app.enabled('cache') ? 5184000000 : 0
			}));
			if (process.env.NODE_ENV === 'development') {
				winston.info('Custom templates directory routed for theme: ' + themeData['theme:id']);
			}
		}
	} else {
		// If not using a local theme (bootswatch, etc), drop back to vanilla
		if (process.env.NODE_ENV === 'development') {
			winston.info('[themes] Using theme ' + themeId);
		}

		app.use(require('less-middleware')({
			src: path.join(nconf.get('themes_path'), '/nodebb-theme-vanilla'),
			dest: path.join(__dirname, '../../public/css'),
			prefix: nconf.get('relative_path') + '/css',
			yuicompress: app.enabled('minification') ? true : false
		}));
	}
}

function compileTemplates() {
	var mkdirp = require('mkdirp');

	winston.info('[themes] Compiling templates');
	utils.walk(nconf.get('base_templates_path'), function(err, baseTpls) {
		utils.walk(nconf.get('theme_templates_path'), function (err, themeTpls) {
			var paths = {};

			baseTpls = baseTpls.map(function(tpl) { return tpl.replace(nconf.get('base_templates_path'), ''); });
			themeTpls = themeTpls.map(function(tpl) { return tpl.replace(nconf.get('theme_templates_path'), ''); });

			baseTpls.forEach(function(el, i) {
				var relative_path = (themeTpls.indexOf(el) !== -1 ? themeTpls[themeTpls.indexOf(el)] : baseTpls[i]),
					full_path = path.join(themeTpls.indexOf(el) !== -1 ? nconf.get('theme_templates_path') : nconf.get('base_templates_path'), relative_path);

				paths[themeTpls.indexOf(el) !== -1 ? themeTpls[themeTpls.indexOf(el)] : baseTpls[i]] = full_path;
			});

			async.each(Object.keys(paths), function(relative_path, next) {
				var file = fs.readFileSync(paths[relative_path]).toString(),
					matches = null,
					regex = /[ \t]*<!-- IMPORT ([\s\S]*?)? -->[ \t]*/;

				while (matches = file.match(regex)) {
					if (paths["/" + matches[1]]) {
						file = file.replace(regex, fs.readFileSync(paths["/" + matches[1]]).toString());
					} else {
						winston.warn('[themes] Partial not found: ' + matches[1]);
						file = file.replace(regex, "");
					}
				}

				mkdirp.sync(path.join(nconf.get('views_dir'), relative_path.split('/').slice(0, -1).join('/')));
				fs.writeFile(path.join(nconf.get('views_dir'), relative_path), file, next);
			}, function(err) {
				if (err) {
					winston.error(err);
				} else {
					winston.info('[themes] Successfully compiled templates.');
				}
			});
		});
	});
}

function handleErrors(err, req, res, next) {
	// we may use properties of the error object
	// here and next(err) appropriately, or if
	// we possibly recovered from the error, simply next().
	console.error(err.stack);
	var status = err.status || 500;
	res.status(status);

	res.json(status, {
		error: err.message
	});
}

function catch404(req, res, next) {
	var	isLanguage = new RegExp('^' + nconf.get('relative_path') + '/language/[\\w]{2,}/.*.json'),
		isClientScript = new RegExp('^' + nconf.get('relative_path') + '\\/src\\/forum(\\/admin)?\\/[\\w]+\\.js');

	res.status(404);

	if (isClientScript.test(req.url)) {
		res.type('text/javascript').send(200, '');
	} else if (isLanguage.test(req.url)) {
		res.json(200, {});
	} else if (req.accepts('html')) {
		if (process.env.NODE_ENV === 'development') {
			winston.warn('Route requested but not found: ' + req.url);
		}

		res.redirect(nconf.get('relative_path') + '/404');
	} else if (req.accepts('json')) {
		if (process.env.NODE_ENV === 'development') {
			winston.warn('Route requested but not found: ' + req.url);
		}

		res.json({
			error: 'Not found'
		});
	} else {
		res.type('txt').send('Not found');
	}
}




module.exports = function(app, data) {
	middleware = require('./middleware')(app);

	app.configure(function() {
		app.engine('tpl', templates.__express);
		app.set('view engine', 'tpl');
		app.set('views', nconf.get('views_dir'));

		app.use(express.compress());

		app.use(express.favicon(path.join(__dirname, '../../', 'public', meta.config['brand:favicon'] ? meta.config['brand:favicon'] : 'favicon.ico')));
		app.use('/apple-touch-icon', middleware.routeTouchIcon);

		app.use(require('less-middleware')({
			src: path.join(__dirname, '../../', 'public'),
			prefix: nconf.get('relative_path'),
			yuicompress: app.enabled('minification') ? true : false
		}));

		app.use(express.bodyParser());
		app.use(express.cookieParser());

		app.use(express.session({
			store: db.sessionStore,
			secret: nconf.get('secret'),
			key: 'express.sid',
			cookie: {
				maxAge: 1000 * 60 * 60 * 24 * parseInt(meta.configs.loginDays || 14, 10)
			}
		}));

		app.use(express.csrf()); // todo, make this a conditional middleware

		app.use(function (req, res, next) {
			res.locals.csrf_token = req.session._csrf;
			res.setHeader('X-Frame-Options', 'SAMEORIGIN');
			next();
		});

		app.use(middleware.processRender);

		auth.initialize(app);

		routeCurrentTheme(app, data.currentThemeData);
		routeThemeScreenshots(app, data.themesData);
		compileTemplates();

		app.use(app.router);

		app.use(nconf.get('relative_path'), express.static(path.join(__dirname, '../../', 'public'), {
			maxAge: app.enabled('cache') ? 5184000000 : 0
		}));

		app.use(catch404);
		app.use(handleErrors);
	});

	return middleware;
};