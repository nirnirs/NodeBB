'use strict';

const async = require('async');
const path = require('path');
const csrf = require('csurf');
const validator = require('validator');
const nconf = require('nconf');
const toobusy = require('toobusy-js');
const LRU = require('lru-cache');
const util = require('util');

const plugins = require('../plugins');
const meta = require('../meta');
const user = require('../user');
const groups = require('../groups');
const analytics = require('../analytics');
const privileges = require('../privileges');
const helpers = require('./helpers');

const controllers = {
	api: require('../controllers/api'),
	helpers: require('../controllers/helpers'),
};

const delayCache = new LRU({
	maxAge: 1000 * 60,
});

const middleware = module.exports;

const relative_path = nconf.get('relative_path');

middleware.regexes = {
	timestampedUpload: /^\d+-.+$/,
};

const csurfMiddleware = csrf({
	cookie: nconf.get('url_parsed').protocol === 'https:' ? {
		secure: true,
		sameSite: 'Strict',
		httpOnly: true,
	} : true,
});

middleware.applyCSRF = function (req, res, next) {
	if (req.uid >= 0) {
		csurfMiddleware(req, res, next);
	} else {
		next();
	}
};
middleware.applyCSRFasync = util.promisify(middleware.applyCSRF);

middleware.ensureLoggedIn = (req, res, next) => {
	if (!req.loggedIn) {
		return controllers.helpers.notAllowed(req, res);
	}

	setImmediate(next);
};

Object.assign(middleware, {
	admin: require('./admin'),
	...require('./header'),
});
require('./render')(middleware);
require('./maintenance')(middleware);
require('./user')(middleware);
require('./uploads')(middleware);
require('./headers')(middleware);
require('./expose')(middleware);
middleware.assert = require('./assert');

middleware.stripLeadingSlashes = function stripLeadingSlashes(req, res, next) {
	const target = req.originalUrl.replace(relative_path, '');
	if (target.startsWith('//')) {
		return res.redirect(relative_path + target.replace(/^\/+/, '/'));
	}
	next();
};

middleware.pageView = helpers.try(async (req, res, next) => {
	if (req.loggedIn) {
		await Promise.all([
			user.updateOnlineUsers(req.uid),
			user.updateLastOnlineTime(req.uid),
		]);
	}
	next();
	await analytics.pageView({ ip: req.ip, uid: req.uid });
	plugins.hooks.fire('action:middleware.pageView', { req: req });
});

middleware.pluginHooks = helpers.try(async (req, res, next) => {
	// TODO: Deprecate in v2.0
	await async.each(plugins.loadedHooks['filter:router.page'] || [], (hookObj, next) => {
		hookObj.method(req, res, next);
	});

	await plugins.hooks.fire('response:router.page', {
		req: req,
		res: res,
	});

	if (!res.headersSent) {
		next();
	}
});

middleware.validateFiles = function validateFiles(req, res, next) {
	if (!Array.isArray(req.files.files) || !req.files.files.length) {
		return next(new Error(['[[error:invalid-files]]']));
	}

	next();
};

middleware.prepareAPI = function prepareAPI(req, res, next) {
	res.locals.isAPI = true;
	next();
};

middleware.routeTouchIcon = function routeTouchIcon(req, res) {
	if (meta.config['brand:touchIcon'] && validator.isURL(meta.config['brand:touchIcon'])) {
		return res.redirect(meta.config['brand:touchIcon']);
	}
	let iconPath = '';
	if (meta.config['brand:touchIcon']) {
		iconPath = path.join(nconf.get('upload_path'), meta.config['brand:touchIcon'].replace(/assets\/uploads/, ''));
	} else {
		iconPath = path.join(nconf.get('base_dir'), 'public/images/touch/512.png');
	}

	return res.sendFile(iconPath, {
		maxAge: req.app.enabled('cache') ? 5184000000 : 0,
	});
};

middleware.privateTagListing = helpers.try(async (req, res, next) => {
	const canView = await privileges.global.can('view:tags', req.uid);
	if (!canView) {
		return controllers.helpers.notAllowed(req, res);
	}
	next();
});

middleware.exposeGroupName = helpers.try(async (req, res, next) => {
	await expose('groupName', groups.getGroupNameByGroupSlug, 'slug', req, res, next);
});

middleware.exposeUid = helpers.try(async (req, res, next) => {
	await expose('uid', user.getUidByUserslug, 'userslug', req, res, next);
});

async function expose(exposedField, method, field, req, res, next) {
	if (!req.params.hasOwnProperty(field)) {
		return next();
	}
	res.locals[exposedField] = await method(req.params[field]);
	next();
}

middleware.privateUploads = function privateUploads(req, res, next) {
	if (req.loggedIn || !meta.config.privateUploads) {
		return next();
	}

	if (req.path.startsWith(`${nconf.get('relative_path')}/assets/uploads/files`)) {
		const extensions = (meta.config.privateUploadsExtensions || '').split(',').filter(Boolean);
		let ext = path.extname(req.path);
		ext = ext ? ext.replace(/^\./, '') : ext;
		if (!extensions.length || extensions.includes(ext)) {
			return res.status(403).json('not-allowed');
		}
	}
	next();
};

middleware.busyCheck = function busyCheck(req, res, next) {
	if (global.env === 'production' && meta.config.eventLoopCheckEnabled && toobusy()) {
		analytics.increment('errors:503');
		res.status(503).type('text/html').sendFile(path.join(__dirname, '../../public/503.html'));
	} else {
		setImmediate(next);
	}
};

middleware.applyBlacklist = async function applyBlacklist(req, res, next) {
	try {
		await meta.blacklist.test(req.ip);
		next();
	} catch (err) {
		next(err);
	}
};

middleware.delayLoading = function delayLoading(req, res, next) {
	// Introduces an artificial delay during load so that brute force attacks are effectively mitigated

	// Add IP to cache so if too many requests are made, subsequent requests are blocked for a minute
	let timesSeen = delayCache.get(req.ip) || 0;
	if (timesSeen > 10) {
		return res.sendStatus(429);
	}
	delayCache.set(req.ip, timesSeen += 1);

	setTimeout(next, 1000);
};

middleware.buildSkinAsset = helpers.try(async (req, res, next) => {
	// If this middleware is reached, a skin was requested, so it is built on-demand
	const target = path.basename(req.originalUrl).match(/(client-[a-z]+)/);
	if (!target) {
		return next();
	}

	await plugins.prepareForBuild(['client side styles']);
	const css = await meta.css.buildBundle(target[0], true);
	require('../meta/minifier').killAll();
	res.status(200).type('text/css').send(css);
});

middleware.trimUploadTimestamps = function trimUploadTimestamps(req, res, next) {
	// Check match
	let basename = path.basename(req.path);
	if (req.path.startsWith('/uploads/files/') && middleware.regexes.timestampedUpload.test(basename)) {
		basename = basename.slice(14);
		res.header('Content-Disposition', `inline; filename="${basename}"`);
	}

	next();
};

middleware.validateAuth = helpers.try(async (req, res, next) => {
	try {
		await plugins.hooks.fire('static:auth.validate', {
			user: res.locals.user,
			strategy: res.locals.strategy,
		});
		next();
	} catch (err) {
		const regenerateSession = util.promisify(cb => req.session.regenerate(cb));
		await regenerateSession();
		req.uid = 0;
		req.loggedIn = false;
		next(err);
	}
});

middleware.checkRequired = function (fields, req, res, next) {
	// Used in API calls to ensure that necessary parameters/data values are present
	const missing = fields.filter(field => !req.body.hasOwnProperty(field));

	if (!missing.length) {
		return next();
	}

	controllers.helpers.formatApiResponse(400, res, new Error(`Required parameters were missing from this API call: ${missing.join(', ')}`));
};
