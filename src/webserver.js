var express = require('express'),
	express_namespace = require('express-namespace'),
	WebServer = express(),
	server = require('http').createServer(WebServer),
	RedisStore = require('connect-redis')(express),
	path = require('path'),
	RDB = require('./redis'),
	utils = require('../public/src/utils.js'),
	pkg = require('../package.json'),
	fs = require('fs'),

	user = require('./user.js'),
	categories = require('./categories.js'),
	posts = require('./posts.js'),
	topics = require('./topics.js'),
	notifications = require('./notifications.js'),
	admin = require('./routes/admin.js'),
	userRoute = require('./routes/user.js'),
	apiRoute = require('./routes/api.js'),
	auth = require('./routes/authentication.js'),
	meta = require('./meta.js'),
	feed = require('./feed'),
	plugins = require('./plugins'),
	nconf = require('nconf'),
	winston = require('winston'),
	validator = require('validator'),
	async = require('async'),
	logger = require('./logger.js');

(function (app) {
	var templates = null,
		clientScripts;

	// Minify client-side libraries
	meta.js.get(function (err, scripts) {
		clientScripts = scripts.map(function (script) {
			return script = {
				script: script
			}
		});
	});

	server.app = app;

	/**
	 *	`options` object	requires:	req, res
	 *						accepts:	metaTags
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
				content: meta.config['keywords'] || ''
			}],
				metaString = utils.buildMetaTags(defaultMetaTags.concat(options.metaTags || [])),
				templateValues = {
					cssSrc: meta.config['theme:src'] || nconf.get('relative_path') + '/vendor/bootstrap/css/bootstrap.min.css',
					pluginCSS: plugins.cssFiles.map(function(file) { return { path: file } }),
					title: meta.config.title || 'NodeBB',
					browserTitle: meta.config.title || 'NodeBB',
					csrf: options.res.locals.csrf_token,
					relative_path: nconf.get('relative_path'),
					meta_tags: metaString,
					clientScripts: clientScripts,
					navigation: custom_header.navigation
				};

			translator.translate(templates.header.parse(templateValues), function(template) {
				callback(null, template);
			});
		});
	};

	// Middlewares
	app.configure(function() {
		async.series([
			function(next) {
				// Pre-router middlewares
				app.use(express.compress());

				logger.init(app);

				app.use(express.favicon(path.join(__dirname, '../', 'public', 'favicon.ico')));
				app.use(require('less-middleware')({
					src: path.join(__dirname, '../', 'public'),
					prefix: nconf.get('relative_path'),
					yuicompress: true
				}));
				app.use(express.bodyParser()); // Puts POST vars in request.body
				app.use(express.cookieParser()); // If you want to parse cookies (res.cookies)
				app.use(express.session({
					store: new RedisStore({
						client: RDB,
						ttl: 60 * 60 * 24 * 30
					}),
					secret: nconf.get('secret'),
					key: 'express.sid',
					cookie: {
						maxAge: 60 * 60 * 24 * 30 * 1000 // 30 days
					}
				}));
				app.use(express.csrf());

				// Local vars, other assorted setup
				app.use(function (req, res, next) {
					nconf.set('https', req.secure);
					res.locals.csrf_token = req.session._csrf;
					next();
				});

				// Authentication Routes
				auth.initialize(app);

				next();
			},
			function(next) {
				async.parallel([
					function(next) {
						// Static Directories for NodeBB Plugins
						plugins.ready(function () {
							for (d in plugins.staticDirs) {
								app.use(nconf.get('relative_path') + '/plugins/' + d, express.static(plugins.staticDirs[d]));
								if (process.env.NODE_ENV === 'development') winston.info('Static directory routed for plugin: ' + d);
							}

							next();
						});
					},
					function(next) {
						RDB.hmget('config', 'theme:type', 'theme:id', function(err, themeData) {
							var themeId = (themeData[1] || 'nodebb-theme-vanilla');

							if (!themeData[0] || themeData[0] === 'local') {
								if (process.env.NODE_ENV === 'development') winston.info('[themes] Using theme ' + themeId);

								app.use(require('less-middleware')({
									src: path.join(__dirname, '../node_modules/' + themeId),
									dest: path.join(__dirname, '../public/css'),
									prefix: nconf.get('relative_path') + '/css',
									yuicompress: true
								}));

								next();
							} else {
								// If not using a local theme (bootswatch, etc), drop back to vanilla
								if (process.env.NODE_ENV === 'development') winston.info('[themes] Using theme ' + themeId);

								app.use(require('less-middleware')({
									src: path.join(__dirname, '../node_modules/nodebb-theme-vanilla'),
									dest: path.join(__dirname, '../public/css'),
									prefix: nconf.get('relative_path') + '/css',
									yuicompress: true
								}));

								next();
							}
						});
					}
				], next);
			},
			function(next) {
				// Router & post-router middlewares
				app.use(app.router);

				// Static directory /public
				app.use(nconf.get('relative_path'), express.static(path.join(__dirname, '../', 'public')));

				// 404 catch-all
				app.use(function (req, res, next) {
					res.status(404);

					if (path.dirname(req.url).slice(0, 10) === '/src/forum') {
						// Handle missing client-side scripts
						res.type('text/javascript').send(200, '');
					} else if (req.accepts('html')) {
						// respond with html page
						if (process.env.NODE_ENV === 'development') winston.warn('Route requested but not found: ' + req.url);
						res.redirect(nconf.get('relative_path') + '/404');
					} else if (req.accepts('json')) {
						// respond with json
						if (process.env.NODE_ENV === 'development') winston.warn('Route requested but not found: ' + req.url);
						res.json({
							error: 'Not found'
						});
					} else {
						// default to plain-text. send()
						res.type('txt').send('Not found');
					}
				});

				app.use(function (err, req, res, next) {

					// we may use properties of the error object
					// here and next(err) appropriately, or if
					// we possibly recovered from the error, simply next().
					console.error(err.stack);

					res.status(err.status || 500);

					res.json('500', {
						error: err.message
					});
				});

				next();
			}
		], function(err) {
			if (err) {
				winston.error('Errors were encountered while attempting to initialise NodeBB.');
				process.exit();
			} else {
				if (process.env.NODE_ENV === 'development') winston.info('Middlewares loaded.');
			}
		});
	});

	module.exports.init = function () {
		templates = global.templates;

		// translate all static templates served by webserver here. ex. footer, logout
		translator.translate(templates['footer'].toString(), function(parsedTemplate) {
			templates['footer'] = parsedTemplate;
		});
		translator.translate(templates['logout'].toString(), function(parsedTemplate) {
			templates['logout'] = parsedTemplate;
		});

		winston.info('NodeBB Ready');
		server.listen(nconf.get('PORT') || nconf.get('port'), nconf.get('bind_address'));
	}

	app.create_route = function (url, tpl) { // to remove
		return '<script>templates.ready(function(){ajaxify.go("' + url + '", null, "' + tpl + '");});</script>';
	};

	app.namespace(nconf.get('relative_path'), function () {

		auth.create_routes(app);
		admin.create_routes(app);
		userRoute.create_routes(app);
		apiRoute.create_routes(app);


		// Basic Routes (entirely client-side parsed, goal is to move the rest of the crap in this file into this one section)
		(function () {
			var routes = ['login', 'register', 'account', 'recent', 'unread', 'popular', 'active', '403', '404'];

			for (var i = 0, ii = routes.length; i < ii; i++) {
				(function (route) {

					app.get('/' + route, function (req, res) {
						if ((route === 'login' || route === 'register') && (req.user && req.user.uid > 0)) {

							user.getUserField(req.user.uid, 'userslug', function (err, userslug) {
								res.redirect('/user/' + userslug);
							});
							return;
						}

						app.build_header({
							req: req,
							res: res
						}, function (err, header) {
							res.send(header + app.create_route(route) + templates['footer']);
						});
					});
				}(routes[i]));
			}
		}());


		app.get('/', function (req, res) {
			async.parallel({
				"header": function (next) {
					app.build_header({
						req: req,
						res: res,
						metaTags: [{
							name: "title",
							content: meta.config.title || 'NodeBB'
						}, {
							name: "description",
							content: meta.config.description || ''
						}, {
							property: 'og:title',
							content: 'Index | ' + (meta.config.title || 'NodeBB')
						}, {
							property: "og:type",
							content: 'website'
						}]
					}, next);
				},
				"categories": function (next) {
					categories.getAllCategories(function (returnData) {
						returnData.categories = returnData.categories.filter(function (category) {
							if (category.disabled !== '1') return true;
							else return false;
						});

						next(null, returnData);
					}, 0);
				}
			}, function (err, data) {
				res.send(
					data.header +
					'\n\t<noscript>\n' + templates['noscript/header'] + templates['noscript/home'].parse(data.categories) + '\n\t</noscript>' +
					app.create_route('') +
					templates['footer']
				);
			})
		});


		app.get('/topic/:topic_id/:slug?', function (req, res) {
			var tid = req.params.topic_id;

			if (tid.match(/^\d+\.rss$/)) {
				tid = tid.slice(0, -4);
				var rssPath = path.join(__dirname, '../', 'feeds/topics', tid + '.rss'),
					loadFeed = function () {
						fs.readFile(rssPath, function (err, data) {
							if (err) res.type('text').send(404, "Unable to locate an rss feed at this location.");
							else res.type('xml').set('Content-Length', data.length).send(data);
						});

					};

				if (!fs.existsSync(rssPath)) {
					feed.updateTopic(tid, function (err) {
						if (err) res.redirect('/404');
						else loadFeed();
					});
				} else loadFeed();

				return;
			}

			async.waterfall([
				function (next) {
					topics.getTopicWithPosts(tid, ((req.user) ? req.user.uid : 0), 0, -1, function (err, topicData) {
						if (topicData) {
							if (topicData.deleted === '1' && topicData.expose_tools === 0)
								return next(new Error('Topic deleted'), null);
						}

						next(err, topicData);
					});
				},
				function (topicData, next) {
					var lastMod = 0,
						timestamp,
						sanitize = validator.sanitize;

					for (var x = 0, numPosts = topicData.posts.length; x < numPosts; x++) {
						timestamp = parseInt(topicData.posts[x].timestamp, 10);
						if (timestamp > lastMod) lastMod = timestamp;
					}

					app.build_header({
						req: req,
						res: res,
						metaTags: [{
							name: "title",
							content: topicData.topic_name
						}, {
							name: "description",
							content: sanitize(topicData.main_posts[0].content.substr(0, 255)).escape().replace('\n', '')
						}, {
							property: 'og:title',
							content: topicData.topic_name + ' | ' + (meta.config.title || 'NodeBB')
						}, {
							property: "og:type",
							content: 'article'
						}, {
							property: "og:url",
							content: nconf.get('url') + 'topic/' + topicData.slug
						}, {
							property: 'og:image',
							content: topicData.main_posts[0].picture
						}, {
							property: "article:published_time",
							content: new Date(parseInt(topicData.main_posts[0].timestamp, 10)).toISOString()
						}, {
							property: 'article:modified_time',
							content: new Date(lastMod).toISOString()
						}, {
							property: 'article:section',
							content: topicData.category_name
						}]
					}, function (err, header) {
						next(err, {
							header: header,
							topics: topicData
						});
					});
				},
			], function (err, data) {
				if (err) return res.redirect('404');
				var topic_url = tid + (req.params.slug ? '/' + req.params.slug : '');

				res.send(
					data.header +
					'\n\t<noscript>\n' + templates['noscript/header'] + templates['noscript/topic'].parse(data.topics) + '\n\t</noscript>' +
					'\n\t<script>templates.ready(function(){ajaxify.go("topic/' + topic_url + '");});</script>' +
					templates['footer']
				);
			});
		});

		app.get('/category/:category_id/:slug?', function (req, res) {
			var cid = req.params.category_id;

			if (cid.match(/^\d+\.rss$/)) {
				cid = cid.slice(0, -4);
				var rssPath = path.join(__dirname, '../', 'feeds/categories', cid + '.rss'),
					loadFeed = function () {
						fs.readFile(rssPath, function (err, data) {
							if (err) res.type('text').send(404, "Unable to locate an rss feed at this location.");
							else res.type('xml').set('Content-Length', data.length).send(data);
						});

					};

				if (!fs.existsSync(rssPath)) {
					feed.updateCategory(cid, function (err) {
						if (err) res.redirect('/404');
						else loadFeed();
					});
				} else loadFeed();

				return;
			}

			async.waterfall([
				function (next) {
					categories.getCategoryById(cid, 0, function (err, categoryData) {

						if (categoryData) {
							if (categoryData.disabled === '1')
								return next(new Error('Category disabled'), null);
						}
						next(err, categoryData);
					});
				},
				function (categoryData, next) {
					app.build_header({
						req: req,
						res: res,
						metaTags: [{
							name: 'title',
							content: categoryData.category_name
						}, {
							name: 'description',
							content: categoryData.category_description
						}, {
							property: "og:type",
							content: 'website'
						}]
					}, function (err, header) {
						next(err, {
							header: header,
							categories: categoryData
						});
					});
				}
			], function (err, data) {
				if (err) return res.redirect('404');
				var category_url = cid + (req.params.slug ? '/' + req.params.slug : '');

				res.send(
					data.header +
					'\n\t<noscript>\n' + templates['noscript/header'] + templates['noscript/category'].parse(data.categories) + '\n\t</noscript>' +
					'\n\t<script>templates.ready(function(){ajaxify.go("category/' + category_url + '");});</script>' +
					templates['footer']
				);
			});
		});

		app.get('/confirm/:code', function (req, res) {
			app.build_header({
				req: req,
				res: res
			}, function (err, header) {
				res.send(header + '<script>templates.ready(function(){ajaxify.go("confirm/' + req.params.code + '");});</script>' + templates['footer']);
			});
		});

		app.get('/sitemap.xml', function (req, res) {
			var sitemap = require('./sitemap.js');

			sitemap.render(function (xml) {
				res.type('xml').set('Content-Length', xml.length).send(xml);
			});
		});

		app.get('/robots.txt', function (req, res) {
			res.set('Content-Type', 'text/plain');
			res.send("User-agent: *\n" +
				"Disallow: /admin/\n" +
				"Sitemap: " + nconf.get('url') + "sitemap.xml");
		});

		app.get('/cid/:cid', function (req, res) {
			categories.getCategoryData(req.params.cid, function (err, data) {
				if (data)
					res.send(data);
				else
					res.send(404, "Category doesn't exist!");
			});
		});

		app.get('/tid/:tid', function (req, res) {
			topics.getTopicData(req.params.tid, function (data) {
				if (data)
					res.send(data);
				else
					res.send(404, "Topic doesn't exist!");
			});
		});

		app.get('/recent/:term?', function (req, res) {
			// TODO consolidate with /recent route as well -> that can be combined into this area. See "Basic Routes" near top.
			app.build_header({
				req: req,
				res: res
			}, function (err, header) {
				res.send(header + app.create_route("recent/" + req.params.term, null, "recent") + templates['footer']);
			});

		});

		app.get('/pid/:pid', function (req, res) {
			posts.getPostData(req.params.pid, function (data) {
				if (data)
					res.send(data);
				else
					res.send(404, "Post doesn't exist!");
			});
		});

		app.get('/outgoing', function (req, res) {
			if (!req.query.url) return res.redirect('/404');

			app.build_header({
				req: req,
				res: res
			}, function (err, header) {
				res.send(
					header +
					'\n\t<script>templates.ready(function(){ajaxify.go("outgoing?url=' + encodeURIComponent(req.query.url) + '", null, null, true);});</script>' +
					templates['footer']
				);
			});
		});

		app.get('/search', function (req, res) {
			if (!req.user)
				return res.redirect('/403');
			app.build_header({
				req: req,
				res: res
			}, function (err, header) {
				res.send(header + app.create_route("search", null, "search") + templates['footer']);
			});
		});

		app.get('/search/:term', function (req, res) {
			if (!req.user)
				return res.redirect('/403');
			app.build_header({
				req: req,
				res: res
			}, function (err, header) {
				res.send(header + app.create_route("search/" + req.params.term, null, "search") + templates['footer']);
			});
		});

		app.get('/reindex', function (req, res) {
			topics.reIndexAll(function (err) {
				if (err) {
					return res.json(err);
				}

				user.reIndexAll(function (err) {
					if (err) {
						return res.json(err);
					} else {
						res.send('Topics and users reindexed');
					}
				});
			});
		});


		var custom_routes = {
			'routes': [],
			'api_methods': []
		};

		plugins.ready(function() {
			plugins.fireHook('filter:server.create_routes', custom_routes, function(err, custom_routes) {
				var routes = custom_routes.routes;
				for (var route in routes) {
					if (routes.hasOwnProperty(route)) {
						app[routes[route].method || 'get'](routes[route].route, function(req, res) {
							routes[route].options(req, res, function(options) {
								app.build_header({
									req: options.req,
									res: options.res
								}, function (err, header) {
									res.send(header + options.content + templates['footer']);
								});
							});
						});							
					}
				}
			});	
		});
		

	});
}(WebServer));


global.server = server;
