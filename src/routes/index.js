'use strict';

const nconf = require('nconf');
const winston = require('winston');
const path = require('path');
const express = require('express');

const meta = require('../meta');
const controllers = require('../controllers');
const controllerHelpers = require('../controllers/helpers');
const plugins = require('../plugins');

const authRoutes = require('./authentication');
const writeRoutes = require('./write');
const helpers = require('./helpers');

const { setupPageRoute } = helpers;

const _mounts = {
	account: require('./accounts'),
	meta: require('./meta'),
	api: require('./api'),
	admin: require('./admin'),
	feed: require('./feeds'),
};

_mounts.main = (app, middleware, controllers) => {
	const loginRegisterMiddleware = [middleware.redirectToAccountIfLoggedIn];

	setupPageRoute(app, '/login', middleware, loginRegisterMiddleware, controllers.login);
	setupPageRoute(app, '/register', middleware, loginRegisterMiddleware, controllers.register);
	setupPageRoute(app, '/register/complete', middleware, [], controllers.registerInterstitial);
	setupPageRoute(app, '/compose', middleware, [], controllers.composer.get);
	setupPageRoute(app, '/confirm/:code', middleware, [], controllers.confirmEmail);
	setupPageRoute(app, '/outgoing', middleware, [], controllers.outgoing);
	setupPageRoute(app, '/search', middleware, [], controllers.search.search);
	setupPageRoute(app, '/reset/:code?', middleware, [middleware.delayLoading], controllers.reset);
	setupPageRoute(app, '/tos', middleware, [], controllers.termsOfUse);

	setupPageRoute(app, '/email/unsubscribe/:token', middleware, [], controllers.accounts.settings.unsubscribe);
	app.post('/email/unsubscribe/:token', controllers.accounts.settings.unsubscribePost);

	app.post('/compose', middleware.applyCSRF, controllers.composer.post);
};

_mounts.mod = (app, middleware, controllers) => {
	setupPageRoute(app, '/flags', middleware, [], controllers.mods.flags.list);
	setupPageRoute(app, '/flags/:flagId', middleware, [], controllers.mods.flags.detail);
	setupPageRoute(app, '/post-queue', middleware, [], controllers.mods.postQueue);
};

_mounts.globalMod = (app, middleware, controllers) => {
	setupPageRoute(app, '/ip-blacklist', middleware, [], controllers.globalMods.ipBlacklist);
	setupPageRoute(app, '/registration-queue', middleware, [], controllers.globalMods.registrationQueue);
};

_mounts.topic = (app, mount, middleware, controllers) => {
	setupPageRoute(app, `/${mount}/:topic_id/:slug/:post_index?`, middleware, [], controllers.topics.get);
	setupPageRoute(app, `/${mount}/:topic_id/:slug?`, middleware, [], controllers.topics.get);
};

_mounts.post = (app, middleware, controllers) => {
	const middlewares = [middleware.maintenanceMode, middleware.registrationComplete, middleware.pluginHooks];
	app.get('/post/:pid', middleware.busyCheck, middlewares, controllers.posts.redirectToPost);
	app.get('/api/post/:pid', middlewares, controllers.posts.redirectToPost);
};

_mounts.tag = (app, middleware, controllers) => {
	setupPageRoute(app, '/tags/:tag', middleware, [middleware.privateTagListing], controllers.tags.getTag);
	setupPageRoute(app, '/tags', middleware, [middleware.privateTagListing], controllers.tags.getTags);
};

_mounts.category = (app, middleware, controllers) => {
	setupPageRoute(app, '/categories', middleware, [], controllers.categories.list);
	setupPageRoute(app, '/popular', middleware, [], controllers.popular.get);
	setupPageRoute(app, '/recent', middleware, [], controllers.recent.get);
	setupPageRoute(app, '/top', middleware, [], controllers.top.get);
	setupPageRoute(app, '/unread', middleware, [middleware.authenticate], controllers.unread.get);

	setupPageRoute(app, '/category/:category_id/:slug/:topic_index', middleware, [], controllers.category.get);
	setupPageRoute(app, '/category/:category_id/:slug?', middleware, [], controllers.category.get);
};

_mounts.user = (app, middleware, controllers) => {
	const middlewares = [middleware.canViewUsers];

	setupPageRoute(app, '/users', middleware, middlewares, controllers.users.index);
};

_mounts.group = (app, middleware, controllers) => {
	const middlewares = [middleware.canViewGroups];

	setupPageRoute(app, '/groups', middleware, middlewares, controllers.groups.list);
	setupPageRoute(app, '/groups/:slug', middleware, middlewares, controllers.groups.details);
	setupPageRoute(app, '/groups/:slug/members', middleware, middlewares, controllers.groups.members);
};

module.exports = async function (app, middleware) {
	const router = express.Router();
	router.render = function (...args) {
		app.render(...args);
	};
	const ensureLoggedIn = require('connect-ensure-login');

	router.all('(/+api|/+api/*?)', middleware.prepareAPI);
	router.all('(/+api/admin|/+api/admin/*?)', middleware.authenticate, middleware.admin.checkPrivileges);
	router.all('(/+admin|/+admin/*?)', ensureLoggedIn.ensureLoggedIn(`${nconf.get('relative_path')}/login?local=1`), middleware.applyCSRF, middleware.admin.checkPrivileges);

	app.use(middleware.stripLeadingSlashes);

	// handle custom homepage routes
	router.use('/', controllers.home.rewrite);

	// homepage handled by `action:homepage.get:[route]`
	setupPageRoute(router, '/', middleware, [], controllers.home.pluginHook);

	await plugins.reloadRoutes({ router: router });
	await authRoutes.reloadRoutes({ router: router });
	await writeRoutes.reload({ router: router });
	await addCoreRoutes(app, router, middleware);

	winston.info('Routes added');
};

async function addCoreRoutes(app, router, middleware) {
	_mounts.admin(router, middleware, controllers);
	_mounts.meta(router, middleware, controllers);
	_mounts.api(router, middleware, controllers);
	_mounts.feed(router, middleware, controllers);

	_mounts.main(router, middleware, controllers);
	// _mounts.topic(router, middleware, controllers);
	_mounts.post(router, middleware, controllers);
	_mounts.mod(router, middleware, controllers);
	_mounts.globalMod(router, middleware, controllers);
	_mounts.tag(router, middleware, controllers);
	_mounts.category(router, middleware, controllers);
	_mounts.account(router, middleware, controllers);
	_mounts.user(router, middleware, controllers);
	_mounts.group(router, middleware, controllers);

	// Allow plugins/themes to mount some routes elsewhere
	const remountable = ['topic'];
	await Promise.all(remountable.map(async (mount) => {
		const original = mount;
		({ mount } = await plugins.hooks.fire('filter:router.add', { mount }));
		if (mount === null) {	// do not mount at all
			return;
		}

		if (mount !== original) {
			// Set up redirect for fallback handling (some js/tpls may still refer to the traditional mount point)
			router.use(new RegExp(`/(api/)?${original}`), (req, res) => {
				controllerHelpers.redirect(res, `${nconf.get('relative_path')}/${mount}${req.path}`);
			});
		}

		_mounts[original](router, mount, middleware, controllers);
	}));

	const relativePath = nconf.get('relative_path');
	app.use(relativePath || '/', router);

	if (process.env.NODE_ENV === 'development') {
		require('./debug')(app, middleware, controllers);
	}

	app.use(middleware.privateUploads);

	const statics = [
		{ route: '/assets', path: path.join(__dirname, '../../build/public') },
		{ route: '/assets', path: path.join(__dirname, '../../public') },
		{ route: '/plugins', path: path.join(__dirname, '../../build/public/plugins') },
	];
	const staticOptions = {
		maxAge: app.enabled('cache') ? 5184000000 : 0,
	};

	if (path.resolve(__dirname, '../../public/uploads') !== nconf.get('upload_path')) {
		statics.unshift({ route: '/assets/uploads', path: nconf.get('upload_path') });
	}

	statics.forEach((obj) => {
		app.use(relativePath + obj.route, middleware.trimUploadTimestamps, express.static(obj.path, staticOptions));
	});
	app.use(`${relativePath}/uploads`, (req, res) => {
		res.redirect(`${relativePath}/assets/uploads${req.path}?${meta.config['cache-buster']}`);
	});

	// Skins
	meta.css.supportedSkins.forEach((skin) => {
		app.use(`${relativePath}/assets/client-${skin}.css`, middleware.buildSkinAsset);
	});

	app.use(controllers['404'].handle404);
	app.use(controllers.errors.handleURIErrors);
	app.use(controllers.errors.handleErrors);
}
