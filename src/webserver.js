var path = require('path'),
	fs = require('fs'),
	nconf = require('nconf'),
	express = require('express'),
	express_namespace = require('express-namespace'),
	WebServer = express(),
	server,
	winston = require('winston'),
	validator = require('validator'),
	async = require('async'),

	utils = require('../public/src/utils'),
	templates = require('./../public/src/templates'), // todo remove
	translator = require('./../public/src/translator'),

	db = require('./database'),
	user = require('./user'),
	notifications = require('./notifications'),
	auth = require('./routes/authentication'),
	meta = require('./meta'),
	plugins = require('./plugins'),
	logger = require('./logger'),
	controllers = require('./controllers'),
	middleware = require('./middleware'),

	admin = require('./routes/admin'),
	apiRoute = require('./routes/api'),
	feedsRoute = require('./routes/feeds'),
	metaRoute = require('./routes/meta');

if(nconf.get('ssl')) {
	server = require('https').createServer({
		key: fs.readFileSync(nconf.get('ssl').key),
		cert: fs.readFileSync(nconf.get('ssl').cert)
	}, WebServer);
} else {
	server = require('http').createServer(WebServer);
}

// Signals
var	shutdown = function(code) {
		winston.info('[app] Shutdown (SIGTERM/SIGINT) Initialised.');
		db.close();
		winston.info('[app] Database connection closed.');

		winston.info('[app] Shutdown complete.');
		process.exit();
	},
	restart = function() {
		if (process.send) {
			winston.info('[app] Restarting...');
			process.send('nodebb:restart');
		} else {
			winston.error('[app] Could not restart server. Shutting down.');
			shutdown();
		}
	};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGHUP', restart);
process.on('uncaughtException', function(err) {
	winston.error('[app] Encountered Uncaught Exception: ' + err.message);
	console.log(err.stack);
	restart();
});

(function (app) {
	"use strict";

	// this can be moved to app.js
	var	clientScripts;

	plugins.ready(function() {
		// Minify client-side libraries
		meta.js.get(function (err, scripts) {
			clientScripts = scripts.map(function (script) {
				script = {
					script: script
				};

				return script;
			});
		});
	});

	logger.init(app);
	

	async.series({
		themesData: meta.themes.get,
		currentThemeData: function(next) {
			db.getObjectFields('config', ['theme:type', 'theme:id', 'theme:staticDir', 'theme:templates'], next);
		}
	}, function(err, data) {
		middleware(app, data);

		if (err) {
			winston.error('Errors were encountered while attempting to initialise NodeBB.');
			process.exit();
		} else {
			if (process.env.NODE_ENV === 'development') {
				winston.info('Middlewares loaded.');
			}
		}
	});
	
	

	app.prepareAPI = function(req, res, next) {
		res.locals.isAPI = true;
		next();
	};

	app.authenticate = function(req, res, next) {
		if(!req.user) {
			if (res.locals.isAPI) {
				return res.json(403, 'not-allowed');	
			} else {
				return res.redirect('403');
			}
		} else {
			next();
		}
	};

	app.checkGlobalPrivacySettings = function(req, res, next) {
		var callerUID = req.user ? parseInt(req.user.uid, 10) : 0;

		if (!callerUID && !!parseInt(meta.config.privateUserInfo, 10)) {
			if (res.locals.isAPI) {
				return res.json(403, 'not-allowed');
			} else {
				return res.redirect('403');
			}
		}

		next();
	};

	app.checkAccountPermissions = function(req, res, next) {
		var callerUID = req.user ? parseInt(req.user.uid, 10) : 0;

		// this function requires userslug to be passed in. todo: /user/uploadpicture should pass in userslug I think
		user.getUidByUserslug(req.params.userslug, function (err, uid) {
			if (err) {
				return next(err);
			}

			// not sure if this check really should belong here. also make sure we're not doing this check again in the actual method
			if (!uid) {
				if (res.locals.isAPI) {
					return res.json(404);
				} else {
					return res.redirect('404');
				}
			}

			if (parseInt(uid, 10) === callerUID) {
				return next();
			}

			user.isAdministrator(callerUID, function(err, isAdmin) {
				if(err) {
					return next(err);
				}

				if(isAdmin) {
					next();
				}

				if (res.locals.isAPI) {
					return res.json(403, 'not-allowed');
				} else {
					return res.redirect('403');
				}
			});
		});
	};

	app.buildHeader = function(req, res, next) {
		async.parallel([
			function(next) {
				// temp, don't forget to set metaTags and linkTags to res.locals.header
				app.build_header({
					req: req,
					res: res
				}, function(err, template) {
					res.locals.header = template;
					next(err);
				});
			},
			function(next) {
				// this is slower than the original implementation because the rendered template is not cached
				// but I didn't bother to fix this because we will deprecate [filter:footer.build] in favour of the widgets system by 0.4x
				plugins.fireHook('filter:footer.build', '', function(err, appendHTML) {
					app.render('footer', {footerHTML: appendHTML}, function(err, template) {
						translator.translate(template, function(parsedTemplate) {
							res.locals.footer = template;
							next(err);
						});
					});
				});
			}
		], function(err) {
			next();
		});
	};

	/**
	 *	`options` object	requires:	req, res
	 *						accepts:	metaTags, linkTags
	 */
	app.build_header = function (options, callback) {
		var custom_header = {
			'navigation': []
		};

		plugins.fireHook('filter:header.build', custom_header, function(err, custom_header) {
			var defaultMetaTags = [{
					name: 'viewport',
					content: 'width=device-width, initial-scale=1.0, user-scalable=no'
				}, {
					name: 'content-type',
					content: 'text/html; charset=UTF-8'
				}, {
					name: 'apple-mobile-web-app-capable',
					content: 'yes'
				}, {
					property: 'og:site_name',
					content: meta.config.title || 'NodeBB'
				}, {
					property: 'keywords',
					content: meta.config.keywords || ''
				}],
				defaultLinkTags = [{
					rel: 'apple-touch-icon',
					href: '/apple-touch-icon'
				}],
				templateValues = {
					bootswatchCSS: meta.config['theme:src'],
					pluginCSS: plugins.cssFiles.map(function(file) { return { path: nconf.get('relative_path') + file.replace(/\\/g, '/') }; }),
					title: meta.config.title || '',
					description: meta.config.description || '',
					'brand:logo': meta.config['brand:logo'] || '',
					'brand:logo:display': meta.config['brand:logo']?'':'hide',
					csrf: options.res.locals.csrf_token,
					relative_path: nconf.get('relative_path'),
					clientScripts: clientScripts,
					navigation: custom_header.navigation,
					'cache-buster': meta.config['cache-buster'] ? 'v=' + meta.config['cache-buster'] : '',
					allowRegistration: meta.config.allowRegistration === undefined || parseInt(meta.config.allowRegistration, 10) === 1,
					searchEnabled: plugins.hasListeners('filter:search.query') ? true : false
				},
				escapeList = {
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					"'": '&apos;',
					'"': '&quot;'
				};

			var uid = '0';

			// Meta Tags
			/*templateValues.metaTags = defaultMetaTags.concat(options.metaTags || []).map(function(tag) {
				if(!tag || typeof tag.content !== 'string') {
					winston.warn('Invalid meta tag. ', tag);
					return tag;
				}

				tag.content = tag.content.replace(/[&<>'"]/g, function(tag) {
					return escapeList[tag] || tag;
				});
				return tag;
			});*/

			// Link Tags
			/*templateValues.linkTags = defaultLinkTags.concat(options.linkTags || []);
			templateValues.linkTags.push({
				rel: "icon",
				type: "image/x-icon",
				href: nconf.get('relative_path') + '/favicon.ico'
			});*/

			if(options.req.user && options.req.user.uid) {
				uid = options.req.user.uid;
			}

			// Custom CSS
			templateValues.useCustomCSS = false;
			if (meta.config.useCustomCSS === '1') {
				templateValues.useCustomCSS = true;
				templateValues.customCSS = meta.config.customCSS;
			}

			async.parallel([
				function(next) {
					translator.get('pages:' + path.basename(options.req.url), function(translated) {
						/*var	metaTitle = templateValues.metaTags.filter(function(tag) {
								return tag.name === 'title';
							});
						if (translated) {
							templateValues.browserTitle = translated;
						} else if (metaTitle.length > 0 && metaTitle[0].content) {
							templateValues.browserTitle = metaTitle[0].content;
						} else {
							templateValues.browserTitle = meta.config.browserTitle || 'NodeBB';
						}*/

						next();
					});
				},
				function(next) {
					user.isAdministrator(uid, function(err, isAdmin) {
						templateValues.isAdmin = isAdmin || false;
						next();
					});
				}
			], function() {
				/*translator.translate(templates.header.parse(templateValues), function(template) {
					callback(null, template);
				});*/
				app.render('header', templateValues, function(err, template) {
					callback(null, template)
				});
			});
		});
	};

	// Cache static files on production
	if (global.env !== 'development') {
		app.enable('cache');
		app.enable('minification');

		// Configure cache-buster timestamp
		require('child_process').exec('git describe --tags', {
			cwd: path.join(__dirname, '../')
		}, function(err, stdOut) {
			if (!err) {
				meta.config['cache-buster'] = stdOut.trim();
				// winston.info('[init] Cache buster value set to: ' + stdOut);
			} else {
				fs.stat(path.join(__dirname, '../package.json'), function(err, stats) {
					meta.config['cache-buster'] = new Date(stats.mtime).getTime();
				});
			}
		});
	}

	if (nconf.get('port') != 80 && nconf.get('port') != 443 && nconf.get('use_port') === false) {
		winston.info('Enabling \'trust proxy\'');
		app.enable('trust proxy');
	}

	if ((nconf.get('port') == 80 || nconf.get('port') == 443) && process.env.NODE_ENV !== 'development') {
		winston.info('Using ports 80 and 443 is not recommend; use a proxy instead. See README.md');
	}

	module.exports.server = server;
	module.exports.init = function () {
		// translate all static templates served by webserver here. ex. footer, logout
		plugins.fireHook('action:app.load', app);

		/*translator.translate(templates.logout.toString(), function(parsedTemplate) {
			templates.logout = parsedTemplate;
		});*/

		server.on("error", function(e){
			if (e.code === 'EADDRINUSE') {
				winston.error('NodeBB address in use, exiting...');
				process.exit(1);
			} else {
				throw e;
			}
		});

		var port = nconf.get('PORT') || nconf.get('port');
		winston.info('NodeBB attempting to listen on: ' + ((nconf.get('bind_address') === "0.0.0.0" || !nconf.get('bind_address')) ? '0.0.0.0' : nconf.get('bind_address')) + ':' + port);
		server.listen(port, nconf.get('bind_address'), function(){
			winston.info('NodeBB Ready');
		});
	};

	app.create_route = function (url, tpl) { // to remove
		var	routerScript = '<script> \
				ajaxify.initialLoad = true; \
				templates.ready(function(){ajaxify.go("' + url + '", null, true);}); \
			</script>';

		return routerScript;
	};

	app.namespace(nconf.get('relative_path'), function () {
		auth.registerApp(app);
		metaRoute.createRoutes(app);
		admin.createRoutes(app);
		apiRoute.createRoutes(app);
		feedsRoute.createRoutes(app);

		// Basic Routes (entirely client-side parsed, goal is to move the rest of the crap in this file into this one section)
		(function () {
			var routes = [],
				loginRequired = ['notifications'];

			async.each(routes.concat(loginRequired), function(route, next) {
				app.get('/' + route, function (req, res) {
					if (loginRequired.indexOf(route) !== -1 && !req.user) {
						return res.redirect('/403');
					}

					app.build_header({
						req: req,
						res: res
					}, function (err, header) {
						res.send((isNaN(parseInt(route, 10)) ? 200 : parseInt(route, 10)), header + app.create_route(route) + templates.footer);
					});
				});
			});
		}());

		/* Main */
		app.get('/', app.buildHeader, controllers.home);
		app.get('/api/home', app.prepareAPI, controllers.home);

		app.get('/login', app.buildHeader, controllers.login);
		app.get('/api/login', app.prepareAPI, controllers.login);

		app.get('/register', app.buildHeader, controllers.register);
		app.get('/api/register', app.prepareAPI, controllers.register);

		app.get('/confirm/:code', app.buildHeader, controllers.confirmEmail);
		app.get('/api/confirm/:code', app.prepareAPI, controllers.confirmEmail);

		app.get('/sitemap.xml', controllers.sitemap);
		app.get('/robots.txt', controllers.robots);

		app.get('/outgoing', app.buildHeader, controllers.outgoing);
		app.get('/api/outgoing', app.prepareAPI, controllers.outgoing);

		/* Static Pages */
		app.get('/404', app.buildHeader, controllers.static['404']);
		app.get('/api/404', app.prepareAPI, controllers.static['404']);

		app.get('/403', app.buildHeader, controllers.static['403']);
		app.get('/api/403', app.prepareAPI, controllers.static['403']);

		app.get('/500', app.buildHeader, controllers.static['500']);
		app.get('/api/500', app.prepareAPI, controllers.static['500']);

		/* Topics */
		app.get('/topic/:topic_id/:slug?', app.buildHeader, controllers.topics.get);
		app.get('/api/topic/:topic_id/:slug?', app.prepareAPI, controllers.topics.get);

		/* Categories */
		app.get('/popular/:set?', app.buildHeader, controllers.categories.popular);
		app.get('/api/popular/:set?', app.prepareAPI, controllers.categories.popular);

		app.get('/recent/:term?', app.buildHeader, controllers.categories.recent);
		app.get('/api/recent/:term?', app.prepareAPI, controllers.categories.recent);

		app.get('/unread/', app.buildHeader, app.authenticate, controllers.categories.unread);
		app.get('/api/unread/', app.prepareAPI, app.authenticate, controllers.categories.unread);

		app.get('/unread/total', app.buildHeader, app.authenticate, controllers.categories.unreadTotal);
		app.get('/api/unread/total', app.prepareAPI, app.authenticate, controllers.categories.unreadTotal);

		app.get('/category/:category_id/:slug?', app.buildHeader, controllers.categories.get);
		app.get('/api/category/:category_id/:slug?', app.prepareAPI, controllers.categories.get);

		/* Accounts */
		app.get('/user/:userslug', app.buildHeader, app.checkGlobalPrivacySettings, controllers.accounts.getAccount);
		app.get('/api/user/:userslug', app.prepareAPI, app.checkGlobalPrivacySettings, controllers.accounts.getAccount);

		app.get('/user/:userslug/following', app.buildHeader, app.checkGlobalPrivacySettings, controllers.accounts.getFollowing);
		app.get('/api/user/:userslug/following', app.prepareAPI, app.checkGlobalPrivacySettings, controllers.accounts.getFollowing);

		app.get('/user/:userslug/followers', app.buildHeader, app.checkGlobalPrivacySettings, controllers.accounts.getFollowers);
		app.get('/api/user/:userslug/followers', app.prepareAPI, app.checkGlobalPrivacySettings, controllers.accounts.getFollowers);

		app.get('/user/:userslug/favourites', app.buildHeader, app.checkGlobalPrivacySettings, app.checkAccountPermissions, controllers.accounts.getFavourites);
		app.get('/api/user/:userslug/favourites', app.prepareAPI, app.checkGlobalPrivacySettings, app.checkAccountPermissions, controllers.accounts.getFavourites);

		app.get('/user/:userslug/posts', app.buildHeader, app.checkGlobalPrivacySettings, controllers.accounts.getPosts);
		app.get('/api/user/:userslug/posts', app.prepareAPI, app.checkGlobalPrivacySettings, controllers.accounts.getPosts);

		app.get('/user/:userslug/edit', app.buildHeader, app.checkGlobalPrivacySettings, app.checkAccountPermissions, controllers.accounts.accountEdit);
		app.get('/api/user/:userslug/edit', app.prepareAPI, app.checkGlobalPrivacySettings, app.checkAccountPermissions, controllers.accounts.accountEdit);

		// todo: admin recently gained access to this page, pls check if it actually works
		app.get('/user/:userslug/settings', app.buildHeader, app.checkGlobalPrivacySettings, app.checkAccountPermissions, controllers.accounts.accountSettings);
		app.get('/api/user/:userslug/settings', app.prepareAPI, app.checkGlobalPrivacySettings, app.checkAccountPermissions, controllers.accounts.accountSettings);

		app.get('/api/user/uid/:uid', app.checkGlobalPrivacySettings, controllers.accounts.getUserByUID);

		// this should have been in the API namespace
		// also, perhaps pass in :userslug so we can use checkAccountPermissions middleware, in future will allow admins to upload a picture for a user
		app.post('/user/uploadpicture', app.prepareAPI, app.checkGlobalPrivacySettings, /*app.checkAccountPermissions,*/ controllers.accounts.uploadPicture);

		/* Users */
		app.get('/users', app.buildHeader, app.checkGlobalPrivacySettings, controllers.users.getOnlineUsers);
		app.get('/api/users', app.prepareAPI, app.checkGlobalPrivacySettings, controllers.users.getOnlineUsers);

		// was this duped by accident or purpose?
		app.get('/users/online', app.buildHeader, app.checkGlobalPrivacySettings, controllers.users.getOnlineUsers);
		app.get('/api/users/online', app.prepareAPI, app.checkGlobalPrivacySettings, controllers.users.getOnlineUsers);

		app.get('/users/sort-posts', app.buildHeader, app.checkGlobalPrivacySettings, controllers.users.getUsersSortedByPosts);
		app.get('/api/users/sort-posts', app.prepareAPI, app.checkGlobalPrivacySettings, controllers.users.getUsersSortedByPosts);

		app.get('/users/sort-reputation', app.buildHeader, app.checkGlobalPrivacySettings, controllers.users.getUsersSortedByReputation);
		app.get('/api/users/sort-reputation', app.prepareAPI, app.checkGlobalPrivacySettings, controllers.users.getUsersSortedByReputation);

		app.get('/users/latest', app.buildHeader, app.checkGlobalPrivacySettings, controllers.users.getUsersSortedByJoinDate);
		app.get('/api/users/latest', app.prepareAPI, app.checkGlobalPrivacySettings, controllers.users.getUsersSortedByJoinDate);

		app.get('/users/search', app.buildHeader, app.checkGlobalPrivacySettings, controllers.users.getUsersForSearch);
		app.get('/api/users/search', app.prepareAPI, app.checkGlobalPrivacySettings, controllers.users.getUsersForSearch);




		app.get('/search/:term?', function (req, res) {

			if (!req.user && meta.config.allowGuestSearching !== '1') {
				return res.redirect('/403');
			}
			if(!req.params.term) {
				req.params.term = '';
			}
			app.build_header({
				req: req,
				res: res
			}, function (err, header) {
				res.send(header + app.create_route('search/' + req.params.term, null, 'search') + templates.footer);
			});
		});

		// Other routes
		require('./routes/plugins')(app);

		// Debug routes
		if (process.env.NODE_ENV === 'development') {
			require('./routes/debug')(app);
		}

		var custom_routes = {
			'routes': [],
			'api': [],
			'templates': []
		};

		app.get_custom_templates = function() {
			return custom_routes.templates.map(function(tpl) {
				return tpl.template.split('.tpl')[0];
			});
		};

		plugins.ready(function() {
			plugins.fireHook('filter:server.create_routes', custom_routes, function(err, custom_routes) {
				var routes = custom_routes.routes;
				for (var route in routes) {
					if (routes.hasOwnProperty(route)) {
						(function(route) {
							app[routes[route].method || 'get'](routes[route].route, function(req, res) {
								routes[route].options(req, res, function(options) {
									app.build_header({
										req: options.req || req,
										res: options.res || res
									}, function (err, header) {
										res.send(header + options.content + templates.footer);
									});
								});
							});
						}(route));
					}
				}

				var apiRoutes = custom_routes.api;
				for (var route in apiRoutes) {
					if (apiRoutes.hasOwnProperty(route)) {
						(function(route) {
							app[apiRoutes[route].method || 'get']('/api' + apiRoutes[route].route, function(req, res) {
								apiRoutes[route].callback(req, res, function(data) {
									res.json(data);
								});
							});
						}(route));
					}
				}

				var templateRoutes = custom_routes.templates;
				for (var route in templateRoutes) {
					if (templateRoutes.hasOwnProperty(route)) {
						(function(route) {
							app.get('/templates/' + templateRoutes[route].template, function(req, res) {
								res.send(templateRoutes[route].content);
							});
						}(route));
					}
				}

			});
		});


	});
}(WebServer));
