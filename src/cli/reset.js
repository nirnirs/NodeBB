'use strict';

require('colors');
const path = require('path');
const winston = require('winston');
const async = require('async');
const fs = require('fs');
const util = require('util');

const fsAccessAsync = util.promisify(fs.access);

const db = require('../database');
const events = require('../events');
const meta = require('../meta');
const plugins = require('../plugins');
const widgets = require('../widgets');
const privileges = require('../privileges');

const dirname = require('./paths').baseDir;

const themeNamePattern = /^(@.*?\/)?nodebb-theme-.*$/;
const pluginNamePattern = /^(@.*?\/)?nodebb-(theme|plugin|widget|rewards)-.*$/;

exports.reset = async function (options) {
	const map = {
		theme: async function () {
			let themeId = options.theme;
			if (themeId === true) {
				await resetThemes();
			} else {
				if (!themeNamePattern.test(themeId)) {
					// Allow omission of `nodebb-theme-`
					themeId = 'nodebb-theme-' + themeId;
				}

				await resetTheme(themeId);
			}
		},
		plugin: async function () {
			let pluginId = options.plugin;
			if (pluginId === true) {
				await resetPlugins();
			} else {
				if (!pluginNamePattern.test(pluginId)) {
					// Allow omission of `nodebb-plugin-`
					pluginId = 'nodebb-plugin-' + pluginId;
				}

				await resetPlugin(pluginId);
			}
		},
		widgets: resetWidgets,
		settings: resetSettings,
		all: async function () {
			await resetWidgets();
			await resetThemes();
			await resetPlugin();
			await resetSettings();
		},
	};

	const tasks = Object.keys(map).filter(x => options[x]).map(x => map[x]);

	if (!tasks.length) {
		console.log([
			'No arguments passed in, so nothing was reset.\n'.yellow,
			'Use ./nodebb reset ' + '{-t|-p|-w|-s|-a}'.red,
			'    -t\tthemes',
			'    -p\tplugins',
			'    -w\twidgets',
			'    -s\tsettings',
			'    -a\tall of the above',
			'',
			'Plugin and theme reset flags (-p & -t) can take a single argument',
			'    e.g. ./nodebb reset -p nodebb-plugin-mentions, ./nodebb reset -t nodebb-theme-persona',
			'         Prefix is optional, e.g. ./nodebb reset -p markdown, ./nodebb reset -t persona',
		].join('\n'));

		process.exit(0);
	}

	try {
		await db.init();
		for (const task of tasks) {
			/* eslint-disable no-await-in-loop */
			await task();
		}
		winston.info('[reset] Reset complete');
		await require('../meta/build').buildAll();
		process.exit(0);
	} catch (err) {
		winston.error('[reset] Errors were encountered during reset -- ' + err.message);
		throw err;
	}
};

async function resetSettings() {
	await privileges.global.give(['local:login'], 'registered-users');
	winston.info('[reset] registered-users given login privilege');
	winston.info('[reset] Settings reset to default');
}

async function resetTheme(themeId) {
	try {
		await fsAccessAsync(path.join(dirname, 'node_modules', themeId, 'package.json'));
	} catch (err) {
		winston.warn('[reset] Theme `%s` is not installed on this forum', themeId);
		throw new Error('theme-not-found');
	}
	await resetThemeTo(themeId);
}

async function resetThemes() {
	await resetThemeTo('nodebb-theme-persona');
}

async function resetThemeTo(themeId) {
	await meta.themes.set({
		type: 'local',
		id: themeId,
	});
	await meta.configs.set('bootswatchSkin', '');
	winston.info('[reset] Theme reset to ' + themeId + ' and default skin');
}

function resetPlugin(pluginId, callback) {
	var active = false;

	async.waterfall([
		async.apply(db.isSortedSetMember, 'plugins:active', pluginId),
		function (isMember, next) {
			active = isMember;

			if (isMember) {
				db.sortedSetRemove('plugins:active', pluginId, next);
			} else {
				next();
			}
		},
		function (next) {
			events.log({
				type: 'plugin-deactivate',
				text: pluginId,
			}, next);
		},
	], function (err) {
		if (err) {
			winston.error('[reset] Could not disable plugin: ' + pluginId + ' encountered error %s', err);
		} else if (active) {
			winston.info('[reset] Plugin `%s` disabled', pluginId);
		} else {
			winston.warn('[reset] Plugin `%s` was not active on this forum', pluginId);
			winston.info('[reset] No action taken.');
			err = new Error('plugin-not-active');
		}

		callback(err);
	});
}

function resetPlugins(callback) {
	db.delete('plugins:active', function (err) {
		winston.info('[reset] All Plugins De-activated');
		callback(err);
	});
}

function resetWidgets(callback) {
	async.waterfall([
		plugins.reload,
		widgets.reset,
		function (next) {
			winston.info('[reset] All Widgets moved to Draft Zone');
			next();
		},
	], callback);
}
