'use strict';

var request = require('request');
var nconf = require('nconf');

var myXhr = require('../mocks/newXhr');

var helpers = module.exports;

helpers.loginUser = function (username, password, callback) {
	var jar = request.jar();
	request({
		url: nconf.get('url') + '/api/config',
		json: true,
		jar: jar
	}, function (err, res, body) {
		if (err || res.statusCode !== 200) {
			return callback(err || new Error('[[error:invalid-response]]'));
		}

		request.post(nconf.get('url') + '/login', {
			form: {
				username: username,
				password: password,
			},
			json: true,
			jar: jar,
			headers: {
				'x-csrf-token': body.csrf_token
			}
		}, function (err, res) {
			if (err || res.statusCode !== 200) {
				return callback(err || new Error('[[error:invalid-response]]'));
			}
			myXhr.callbacks.test2 = function () {
				this.setDisableHeaderCheck(true);
				var stdOpen = this.open;
				this.open = function () {
					stdOpen.apply(this, arguments);
					this.setRequestHeader('Cookie', res.headers['set-cookie'][0].split(';')[0]);
				};
			};

			var socketClient = require('socket.io-client');

			var io = socketClient.connect(nconf.get('url'), {forceNew: true, multiplex: false});
			io.on('connect', function () {
				callback(null, jar, io);
			});

			io.on('error', function (err) {
				callback(err);
			});
		});
	});
};

helpers.initSocketIO = function (callback) {
	var jar;
	request.get({
		url: nconf.get('url') + '/api/config',
		jar: jar,
		json: true
	}, function (err, res, body) {
		if (err) {
			return callback(err);
		}

		myXhr.callbacks.test2 = function () {
			this.setDisableHeaderCheck(true);
			var stdOpen = this.open;
			this.open = function () {
				stdOpen.apply(this, arguments);
				this.setRequestHeader('Cookie', res.headers['set-cookie'][0].split(';')[0]);
			};
		};

		var io = require('socket.io-client')(nconf.get('url'), {forceNew: true});

		io.on('connect', function () {
			callback(null, jar, io);
		});

		io.on('error', function (err) {
			callback(err);
		});
	});
};
