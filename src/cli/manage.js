'use strict';

const async = require('async');
const winston = require('winston');
const childProcess = require('child_process');
const _ = require('lodash');
const CliGraph = require('cli-graph');

const build = require('../meta/build');
const db = require('../database');
const plugins = require('../plugins');
const events = require('../events');
const analytics = require('../analytics');
const reset = require('./reset');
const { pluginNamePattern, themeNamePattern } = require('../constants');

function buildTargets() {
	var aliases = build.aliases;
	var length = 0;
	var output = Object.keys(aliases).map(function (name) {
		var arr = aliases[name];
		if (name.length > length) {
			length = name.length;
		}

		return [name, arr.join(', ')];
	}).map(function (tuple) {
		return '     ' + _.padEnd('"' + tuple[0] + '"', length + 2).magenta + '  |  ' + tuple[1];
	}).join('\n');
	console.log(
		'\n\n  Build targets:\n' +
		('\n     ' + _.padEnd('Target', length + 2) + '  |  Aliases').green +
		'\n     ------------------------------------------------------\n'.blue +
		output + '\n'
	);
}

function activate(plugin) {
	if (themeNamePattern.test(plugin)) {
		reset.reset({
			theme: plugin,
		}, function (err) {
			if (err) { throw err; }
			process.exit();
		});
		return;
	}

	async.waterfall([
		function (next) {
			db.init(next);
		},
		function (next) {
			if (!pluginNamePattern.test(plugin)) {
				// Allow omission of `nodebb-plugin-`
				plugin = 'nodebb-plugin-' + plugin;
			}
			plugins.isInstalled(plugin, next);
		},
		function (isInstalled, next) {
			if (!isInstalled) {
				return next(new Error('plugin not installed'));
			}
			plugins.isActive(plugin, next);
		},
		function (isActive, next) {
			if (isActive) {
				winston.info('Plugin `%s` already active', plugin);
				process.exit(0);
			}

			db.sortedSetCard('plugins:active', next);
		},
		function (numPlugins, next) {
			winston.info('Activating plugin `%s`', plugin);
			db.sortedSetAdd('plugins:active', numPlugins, plugin, next);
		},
		function (next) {
			events.log({
				type: 'plugin-activate',
				text: plugin,
			}, next);
		},
	], function (err) {
		if (err) {
			winston.error('An error occurred during plugin activation', err.stack);
			throw err;
		}
		process.exit(0);
	});
}

async function listPlugins() {
	await db.init();
	const installed = await plugins.showInstalled();
	const installedList = installed.map(plugin => plugin.name);
	const active = await db.getSortedSetRange('plugins:active', 0, -1);

	// Merge the two sets, defer to plugins in  `installed` if already present
	let combined = installed.concat(active.reduce((memo, cur) => {
		if (!installedList.includes(cur)) {
			memo.push({
				id: cur,
				active: true,
				installed: false,
			});
		}

		return memo;
	}, []));

	// Alphabetical sort
	combined = combined.sort((a, b) => (a.id > b.id ? 1 : -1));

	// Pretty output
	process.stdout.write('Active plugins:\n');
	combined.forEach((plugin) => {
		process.stdout.write('\t* ' + plugin.id + ' (');
		process.stdout.write(plugin.installed ? 'installed'.green : 'not installed'.red);
		process.stdout.write(', ');
		process.stdout.write(plugin.active ? 'enabled'.green : 'disabled'.yellow);
		process.stdout.write(')\n');
	});

	process.exit();
}

function listEvents(count) {
	async.waterfall([
		function (next) {
			db.init(next);
		},
		async.apply(events.getEvents, '', 0, (count || 10) - 1),
		function (eventData) {
			console.log(('\nDisplaying last ' + count + ' administrative events...').bold);
			eventData.forEach(function (event) {
				console.log('  * ' + String(event.timestampISO).green + ' ' + String(event.type).yellow + (event.text ? ' ' + event.text : '') + ' (uid: '.reset + (event.uid ? event.uid : 0) + ')');
			});
			process.exit();
		},
	], function (err) {
		throw err;
	});
}

function info() {
	console.log('');
	async.waterfall([
		function (next) {
			var version = require('../../package.json').version;
			console.log('  version:  ' + version);

			console.log('  Node ver: ' + process.version);
			next();
		},
		function (next) {
			var hash = childProcess.execSync('git rev-parse HEAD');
			console.log('  git hash: ' + hash);
			next();
		},
		function (next) {
			var config = require('../../config.json');
			console.log('  database: ' + config.database);
			next();
		},
		function (next) {
			db.init(next);
		},
		function (next) {
			db.info(db.client, next);
		},
		function (info, next) {
			var config = require('../../config.json');

			switch (config.database) {
				case 'redis':
					console.log('        version: ' + info.redis_version);
					console.log('        disk sync:  ' + info.rdb_last_bgsave_status);
					break;

				case 'mongo':
					console.log('        version: ' + info.version);
					console.log('        engine:  ' + info.storageEngine);
					break;
			}

			next();
		},
		async.apply(analytics.getHourlyStatsForSet, 'analytics:pageviews', Date.now(), 24),
		function (data, next) {
			var graph = new CliGraph({
				height: 12,
				width: 25,
				center: {
					x: 0,
					y: 11,
				},
			});
			var min = Math.min(...data);
			var max = Math.max(...data);

			data.forEach(function (point, idx) {
				graph.addPoint(idx + 1, Math.round(point / max * 10));
			});

			console.log('');
			console.log(graph.toString());
			console.log('Pageviews, last 24h (min: ' + min + '  max: ' + max + ')');
			next();
		},
	], function (err) {
		if (err) { throw err; }
		process.exit();
	});
}

function buildWrapper(targets, options) {
	build.build(targets, options, function (err) {
		if (err) {
			winston.error(err.stack);
			process.exit(1);
		}
		process.exit(0);
	});
}

exports.build = buildWrapper;
exports.buildTargets = buildTargets;
exports.activate = activate;
exports.listPlugins = listPlugins;
exports.listEvents = listEvents;
exports.info = info;
