/*
	NodeBB - A forum powered by node in development by designcreateplay
	Copyright (C) 2013  DesignCreatePlay Inc.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

(function () {
	"use strict";

	// Configuration setup
	var nconf = require('nconf');
	nconf.argv().env();

	var fs = require('fs'),
		async = require('async'),
		semver = require('semver'),
		winston = require('winston'),
		path = require('path'),
		pkg = require('./package.json'),
		utils = require('./public/src/utils.js'),
		meta;

	// Runtime environment
	global.env = process.env.NODE_ENV || 'production';

	winston.remove(winston.transports.Console);
	winston.add(winston.transports.Console, {
		colorize: true
	});

	winston.add(winston.transports.File, {
		filename: 'error.log',
		level: 'error'
	});

	// TODO: remove once https://github.com/flatiron/winston/issues/280 is fixed
	winston.err = function (err) {
		winston.error(err.stack);
	};

	require('child_process').exec('/usr/bin/which convert', function(err, stdout, stderr) {
		if(err || !stdout) {
			winston.warn('Couldn\'t find convert. Did you install imagemagick?');
		}
	});

	// Log GNU copyright info along with server info
	winston.info('NodeBB v' + pkg.version + ' Copyright (C) 2013 DesignCreatePlay Inc.');
	winston.info('This program comes with ABSOLUTELY NO WARRANTY.');
	winston.info('This is free software, and you are welcome to redistribute it under certain conditions.');
	winston.info('');


	if (!nconf.get('help') && !nconf.get('setup') && !nconf.get('install') && !nconf.get('upgrade') && fs.existsSync(__dirname + '/config.json')) {
		// Load server-side configs
		nconf.file({
			file: __dirname + '/config.json'
		});
		meta = require('./src/meta');

		nconf.set('url', nconf.get('base_url') + (nconf.get('use_port') ? ':' + nconf.get('port') : '') + nconf.get('relative_path') + path.sep);
		nconf.set('upload_url', path.join(path.sep, nconf.get('relative_path'), 'uploads', path.sep));
		nconf.set('base_dir', __dirname);

		winston.info('Initializing NodeBB v' + pkg.version + ', on port ' + nconf.get('port') + ', using ' + nconf.get('database') +' store at ' + nconf.get(nconf.get('database') + ':host') + ':' + nconf.get(nconf.get('database') + ':port') + '.');
		winston.info('NodeBB instance bound to: ' + ((nconf.get('bind_address') === "0.0.0.0" || !nconf.get('bind_address')) ? 'Any address (0.0.0.0)' : nconf.get('bind_address')));

		if (process.env.NODE_ENV === 'development') {
			winston.info('Base Configuration OK.');
		}

		if (semver.gt(pkg.dependencies['nodebb-theme-cerulean'], require('./node_modules/nodebb-theme-cerulean/package.json').version)) {
			winston.error('nodebb-theme-cerulean is out of date - please run npm install.')
		}

		require('./src/database').init(function(err) {
			meta.configs.init(function () {

				var templates = require('./public/src/templates'),
					translator = require('./public/src/translator'),
					webserver = require('./src/webserver'),
					SocketIO =  require('socket.io').listen(global.server, { log: false, transports: ['websocket', 'xhr-polling', 'jsonp-polling', 'flashsocket'], 'browser client minification': true}),
					websockets = require('./src/websockets'),
					plugins = require('./src/plugins'),
					notifications = require('./src/notifications'),
					upgrade = require('./src/upgrade');

				templates.setGlobal('relative_path', nconf.get('relative_path'));

				upgrade.check(function(schema_ok) {
					if (schema_ok || nconf.get('check-schema') === false) {
						websockets.init(SocketIO);

						plugins.init();
						global.templates = {};
						global.translator = translator;

						translator.loadServer();

						var customTemplates = meta.config['theme:templates'] ? path.join(__dirname, 'node_modules', meta.config['theme:id'], meta.config['theme:templates']) : false;


						utils.walk(path.join(__dirname, 'public/templates'), function (err, tplsToLoad) {
							templates.init(tplsToLoad, customTemplates);
						});

						plugins.ready(function() {
							templates.ready(webserver.init);
						});

						notifications.init();
					} else {
						winston.warn('Your NodeBB schema is out-of-date. Please run the following command to bring your dataset up to spec:');
						winston.warn('    node app --upgrade');
						winston.warn('To ignore this error (not recommended):');
						winston.warn('    node app --no-check-schema')
						process.exit();
					}
				});
			});
		});
	} else if (nconf.get('setup') || nconf.get('install') || !fs.existsSync(__dirname + '/config.json')) {
		// New install, ask setup questions
		if (nconf.get('setup')) {
			winston.info('NodeBB Setup Triggered via Command Line');
		} else {
			winston.warn('Configuration not found, starting NodeBB setup');
		}

		nconf.file({
			file: __dirname + '/config.json'
		});

		var templates = require('./public/src/templates'),
			install = require('./src/install');

		winston.info('Welcome to NodeBB!');
		winston.info('This looks like a new installation, so you\'ll have to answer a few questions about your environment before we can proceed.');
		winston.info('Press enter to accept the default setting (shown in brackets).');

		install.setup(function (err) {
			if (err) {
				winston.error('There was a problem completing NodeBB setup: ', err.message);
			} else {
				winston.info('NodeBB Setup Completed. Run \'node app\' to manually start your NodeBB server.');
			}

			process.exit();
		});

	} else if (nconf.get('upgrade')) {
		nconf.file({
			file: __dirname + '/config.json'
		});
		require('./src/database').init(function(err) {
			meta = require('./src/meta.js');

			meta.configs.init(function () {
				require('./src/upgrade').upgrade();
			});
		});
	} else/* if (nconf.get('help') */{
		winston.info('Usage: node app [options] [arguments]');
		winston.info('       [NODE_ENV=development | NODE_ENV=production] node app [--start] [arguments]');
		winston.info('');
		winston.info('Options:');
		winston.info('  --help              displays this usage information');
		winston.info('  --setup             configure your environment and setup NodeBB');
		winston.info('  --upgrade           upgrade NodeBB, first read: github.com/designcreateplay/NodeBB/wiki/Upgrading-NodeBB');
		winston.info('  --start             manually start NodeBB (default when no options are given)');
	};
}());
