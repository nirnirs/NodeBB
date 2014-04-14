'use strict';

var async = require('async'),
	fs = require('fs'),
	url = require('url'),
	path = require('path'),
	prompt = require('prompt'),
	winston = require('winston'),
	nconf = require('nconf'),
	utils = require('../public/src/utils.js'),

	ALLOWED_DATABASES = ['redis', 'mongo', 'level'];


var install = {},
	questions = {};

questions.main = [
	{
		name: 'base_url',
		description: 'URL of this installation',
		'default': nconf.get('base_url') || 'http://localhost',
		pattern: /^http(?:s)?:\/\//,
		message: 'Base URL must begin with \'http://\' or \'https://\'',
	},
	{
		name: 'port',
		description: 'Port number of your NodeBB',
		'default': nconf.get('port') || 4567,
		pattern: /[0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5]/,
		message: 'Please enter a value betweeen 1 and 65535'
	},
	{
		name: 'use_port',
		description: 'Use a port number to access NodeBB?',
		'default': (nconf.get('use_port') !== undefined ? (nconf.get('use_port') ? 'y' : 'n') : 'y'),
		pattern: /y[es]*|n[o]?/,
		message: 'Please enter \'yes\' or \'no\''
	},
	{
		name: 'secret',
		description: 'Please enter a NodeBB secret',
		'default': nconf.get('secret') || utils.generateUUID()
	},
	{
		name: 'bind_address',
		description: 'IP or Hostname to bind to',
		'default': nconf.get('bind_address') || '0.0.0.0'
	},
	{
		name: 'database',
		description: 'Which database to use',
		'default': nconf.get('database') || 'redis'
	}
];



ALLOWED_DATABASES.forEach(function(db) {
	questions[db] = require('./database/' + db).questions;
});

function checkSetupFlags (next) {
	// Check if the `--setup` flag contained values we can work with
	var	setupVal;
	try {
		setupVal = JSON.parse(nconf.get('setup'));
	} catch (e) {
		setupVal = undefined;
	}

	if (setupVal && setupVal instanceof Object) {
		if (setupVal['admin:username'] && setupVal['admin:password'] && setupVal['admin:password:confirm'] && setupVal['admin:email']) {
			install.values = setupVal;
			next();
		} else {
			winston.error('Required values are missing for automated setup:');
			if (!setupVal['admin:username']) {
				winston.error('  admin:username');
			}
			if (!setupVal['admin:password']) {
				winston.error('  admin:password');
			}
			if (!setupVal['admin:password:confirm']) {
				winston.error('  admin:password:confirm');
			}
			if (!setupVal['admin:email']) {
				winston.error('  admin:email');
			}

			process.exit();
		}
	} else {
		next();
	}
}

function checkCIFlags(next) {
	// Check if the `--ci` flag contained values we can work with
	var	ciVals;
	try {
		ciVals = JSON.parse(nconf.get('ci'));
	} catch (e) {
		ciVals = undefined;
	}

	if (ciVals && ciVals instanceof Object) {
		if (ciVals.hasOwnProperty('host') && ciVals.hasOwnProperty('port') && ciVals.hasOwnProperty('database')) {
			install.ciVals = ciVals;
			next();
		} else {
			winston.error('Required values are missing for automated CI integration:');
			if (!ciVals.hasOwnProperty('host')) {
				winston.error('  host');
			}
			if (!ciVals.hasOwnProperty('port')) {
				winston.error('  port');
			}
			if (!ciVals.hasOwnProperty('database')) {
				winston.error('  database');
			}

			process.exit();
		}
	} else {
		next();
	}
}


function setupConfig(next) {
	// maybe this should go into install/database.js
	function success(err, config, callback) {
		if (!config) {
			return next(new Error('aborted'));
		}

		var database = (config.redis || config.mongo || config.level) ? config.secondary_database : config.database;

		function dbQuestionsSuccess(err, databaseConfig) {
			if (!databaseConfig) {
				return next(new Error('aborted'));
			}

			// Translate redis properties into redis object
			if(database === 'redis') {
				config.redis = {
					host: databaseConfig['redis:host'],
					port: databaseConfig['redis:port'],
					password: databaseConfig['redis:password'],
					database: databaseConfig['redis:database']
				};

				if (config.redis.host.slice(0, 1) === '/') {
					delete config.redis.port;
				}
			} else if (database === 'mongo') {
				config.mongo = {
					host: databaseConfig['mongo:host'],
					port: databaseConfig['mongo:port'],
					username: databaseConfig['mongo:username'],
					password: databaseConfig['mongo:password'],
					database: databaseConfig['mongo:database']
				};
			} else if (database === 'level') {
				config.level = {
					database: databaseConfig['level:database']
				};
			} else {
				return next(new Error('unknown database : ' + database));
			}

			var allQuestions = questions.redis.concat(questions.mongo.concat(questions.level));
			for(var x=0;x<allQuestions.length;x++) {
				delete config[allQuestions[x].name];
			}

			callback(err, config);
		}

		// Add CI object
		if (install.ciVals) {
			config.test_database = {};
			for(var prop in install.ciVals) {
				if (install.ciVals.hasOwnProperty(prop)) {
					config.test_database[prop] = install.ciVals[prop];
				}
			}
		}

		if(database === 'redis') {
			if (config['redis:host'] && config['redis:port']) {
				dbQuestionsSuccess(null, config);
			} else {
				prompt.get(questions.redis, dbQuestionsSuccess);
			}
		} else if(database === 'mongo') {
			if (config['mongo:host'] && config['mongo:port']) {
				dbQuestionsSuccess(null, config);
			} else {
				prompt.get(questions.mongo, dbQuestionsSuccess);
			}
		} else if(database === 'level') {
			if (config['level:database']) {
				dbQuestionsSuccess(null, config);
			} else {
				prompt.get(questions.level, dbQuestionsSuccess);
			}
		} else {
			return next(new Error('unknown database : ' + database));
		}
	}

	function getSecondaryDatabaseModules(config, next) {
		prompt.get({
			"name": "secondary_db_modules",
			"description": "Which database modules should " + config.secondary_database + " store?",
			"default": nconf.get('secondary_db_modules') || "hash, list, sets, sorted"
		}, function(err, db) {
			config.secondary_db_modules = db.secondary_db_modules;
			success(err, config, next);
		});
	}

	function configureDatabases(err, config) {
		async.waterfall([
			function(next) {
				winston.info('Now configuring ' + config.database + ' database:');
				success(err, config, next);
			},
			function(config, next) {
				winston.info('Now configuring ' + config.secondary_database + ' database:');
				if (config.secondary_database && ALLOWED_DATABASES.indexOf(config.secondary_database) !== -1) {
					getSecondaryDatabaseModules(config, next);
				} else {
					next(err, config);
				}
			}
		], completeConfigSetup);
	}

	function completeConfigSetup(err, config) {
		config.bcrypt_rounds = 12;
		config.upload_path = '/public/uploads';
		config.use_port = config.use_port.slice(0, 1) === 'y';

		var urlObject = url.parse(config.base_url),
			relative_path = (urlObject.pathname && urlObject.pathname.length > 1) ? urlObject.pathname : '',
			host = urlObject.host,
			protocol = urlObject.protocol,
			server_conf = config;

		server_conf.base_url = protocol + '//' + host;
		server_conf.relative_path = relative_path;

		install.save(server_conf, function(err) {
			if (err) {
				return next(err);
			}

			require('./database').init(next);
		});
	}

	// prompt prepends "prompt: " to questions, let's clear that.
	prompt.start();
	prompt.message = '';
	prompt.delimiter = '';

	if (!install.values) {
		prompt.get(questions.main, function(err, config) {
			if (nconf.get('advanced')) {
				prompt.get({
					name: 'secondary_database',
					description: 'Select secondary database',
					'default': nconf.get('secondary_database') || 'none'
				}, function(err, dbConfig) {
					config.secondary_database = dbConfig.secondary_database;
					configureDatabases(err, config);
				});
			} else {
				configureDatabases(err, config);
			}
		});
	} else {
		// Use provided values, fall back to defaults
		var	config = {},
			question, x, numQ, allQuestions = questions.main.concat(questions.redis).concat(questions.mongo.concat(questions.level));
		for(x=0,numQ=allQuestions.length;x<numQ;x++) {
			question = allQuestions[x];
			config[question.name] = install.values[question.name] || question['default'] || '';
		}

		success(null, config, completeConfigSetup);
	}
}

function setupDefaultConfigs(next) {
	// Applying default database configs
	winston.info('Populating database with default configs, if not already set...');
	var meta = require('./meta');

	fs.readFile(path.join(__dirname, '../', 'install/data/defaults.json'), function (err, defaults) {
		async.each(defaults, function (configObj, next) {
			meta.configs.setOnEmpty(configObj.field, configObj.value, next);
		}, function (err) {
			meta.configs.init(next);
		});

		if (install.values) {
			if (install.values['social:twitter:key'] && install.values['social:twitter:secret']) {
				meta.configs.setOnEmpty('social:twitter:key', install.values['social:twitter:key']);
				meta.configs.setOnEmpty('social:twitter:secret', install.values['social:twitter:secret']);
			}
			if (install.values['social:google:id'] && install.values['social:google:secret']) {
				meta.configs.setOnEmpty('social:google:id', install.values['social:google:id']);
				meta.configs.setOnEmpty('social:google:secret', install.values['social:google:secret']);
			}
			if (install.values['social:facebook:key'] && install.values['social:facebook:secret']) {
				meta.configs.setOnEmpty('social:facebook:app_id', install.values['social:facebook:app_id']);
				meta.configs.setOnEmpty('social:facebook:secret', install.values['social:facebook:secret']);
			}
		}
	});
}

function enableDefaultTheme(next) {
	var	meta = require('./meta');
	winston.info('Enabling default theme: Lavender');

	meta.themes.set({
		type: 'local',
		id: 'nodebb-theme-lavender'
	}, next);
}

function createAdministrator(next) {
	// Check if an administrator needs to be created
	var Groups = require('./groups');
	Groups.get('administrators', {}, function (err, groupObj) {
		if (!err && groupObj && groupObj.memberCount > 0) {
			winston.info('Administrator found, skipping Admin setup');
			next();
		} else {
			createAdmin(next);
		}
	});
}

function createAdmin(callback) {
	var User = require('./user'),
		Groups = require('./groups');

	winston.warn('No administrators have been detected, running initial user setup');

	var questions = [{
			name: 'username',
			description: 'Administrator username',
			required: true,
			type: 'string'
		}, {
			name: 'email',
			description: 'Administrator email address',
			pattern: /.+@.+/,
			required: true
		}],
		passwordQuestions = [{
			name: 'password',
			description: 'Password',
			required: true,
			hidden: true,
			type: 'string'
		}, {
			name: 'password:confirm',
			description: 'Confirm Password',
			required: true,
			hidden: true,
			type: 'string'
		}],
		success = function(err, results) {
			if (!results) {
				return callback(new Error('aborted'));
			}

			if (results['password:confirm'] !== results.password) {
				winston.warn("Passwords did not match, please try again");
				return retryPassword(results);
			}

			nconf.set('bcrypt_rounds', 12);
			User.create({username: results.username, password: results.password, email: results.email}, function (err, uid) {
				if (err) {
					winston.warn(err.message + ' Please try again.');
					return callback(new Error('invalid-values'));
				}

				Groups.join('administrators', uid, callback);
			});
		},
		retryPassword = function (originalResults) {
			// Ask only the password questions
			prompt.get(passwordQuestions, function (err, results) {
				if (!results) {
					return callback(new Error('aborted'));
				}

				// Update the original data with newly collected password
				originalResults.password = results.password;
				originalResults['password:confirm'] = results['password:confirm'];

				// Send back to success to handle
				success(err, originalResults);
			});
		};

	// Add the password questions
	questions = questions.concat(passwordQuestions);

	if (!install.values) {
		prompt.get(questions, success);
	} else {
		var results = {
			username: install.values['admin:username'],
			email: install.values['admin:email'],
			password: install.values['admin:password'],
			'password:confirm': install.values['admin:password:confirm']
		};

		success(null, results);
	}
}

function createCategories(next) {
	// Categories
	var Categories = require('./categories');

	Categories.getAllCategories(0, function (err, data) {
		if (data.categories.length === 0) {
			winston.warn('No categories found, populating instance with default categories');

			fs.readFile(path.join(__dirname, '../', 'install/data/categories.json'), function (err, default_categories) {
				default_categories = JSON.parse(default_categories);

				async.eachSeries(default_categories, function (category, next) {
					Categories.create(category, next);
				}, function (err) {
					if (!err) {
						next();
					} else {
						winston.error('Could not set up categories');
					}
				});
			});
		} else {
			winston.info('Categories OK. Found ' + data.categories.length + ' categories.');
			next();
		}
	});
}

function enableDefaultPlugins(next) {
	// Default plugins
	var Plugins = require('./plugins');

	winston.info('Enabling default plugins');

	var defaultEnabled = [
		'nodebb-plugin-markdown', 'nodebb-plugin-mentions', 'nodebb-widget-essentials'
	];

	async.each(defaultEnabled, function (pluginId, next) {
		Plugins.isActive(pluginId, function (err, active) {
			if (!active) {
				Plugins.toggleActive(pluginId, function () {
					next();
				});
			} else {
				next();
			}
		});
	}, next);
}

function populateDatabase(next) {
	var	db = require('./database.js');

	db.init(function(err) {
		if (!err) {
			db.setObjectField('widgets:global', 'footer', "[{\"widget\":\"html\",\"data\":{\"html\":\"<footer id=\\\"footer\\\" class=\\\"container footer\\\">\\r\\n\\t<div class=\\\"copyright\\\">\\r\\n\\t\\tCopyright © 2014 <a target=\\\"_blank\\\" href=\\\"https://www.nodebb.com\\\">NodeBB Forums</a> | <a target=\\\"_blank\\\" href=\\\"//github.com/designcreateplay/NodeBB/graphs/contributors\\\">Contributors</a>\\r\\n\\t</div>\\r\\n</footer>\",\"title\":\"\",\"container\":\"\"}}]", next);
		}
	});
}

install.setup = function (callback) {
	async.series([checkSetupFlags, checkCIFlags, setupConfig, setupDefaultConfigs, enableDefaultTheme, createAdministrator, createCategories, enableDefaultPlugins, populateDatabase,
		function (next) {
			require('./upgrade').upgrade(next);
		}
	], function (err) {
		if (err) {
			winston.warn('NodeBB Setup Aborted. ' + err.message);
			process.exit();
		} else {
			callback();
		}
	});
};

install.save = function (server_conf, callback) {
	var	serverConfigPath = path.join(__dirname, '../config.json');

	if (nconf.get('config')) {
		serverConfigPath = path.resolve(__dirname, '../', nconf.get('config'));
	}

	fs.writeFile(serverConfigPath, JSON.stringify(server_conf, null, 4), function (err) {
		if (err) {
			winston.error('Error saving server configuration! ' + err.message);
			return callback(err);
		}

		winston.info('Configuration Saved OK');

		nconf.file({
			file: path.join(__dirname, '..', 'config.json')
		});

		callback();
	});
};

module.exports = install;