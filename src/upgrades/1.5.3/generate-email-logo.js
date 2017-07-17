'use strict';

var db = require('../../database');
var image = require('../../image');
var meta = require('../../meta');

var async = require('async');
var winston = require('winston');
var path = require('path');
var nconf = require('nconf');
var url = require('url');

module.exports = {
	name: 'Generate email logo for use in email header',
	timestamp: Date.UTC(2017, 6, 17),
	method: function (callback) {
		var skip = false;

		async.series([
			function (next) {
				// Resize existing logo (if present) to email header size
				var uploadPath = path.join(nconf.get('upload_path'), 'system', 'site-logo-x50.png');
				var sourcePath = meta.config['brand:logo'] ? path.join(nconf.get('upload_path'), 'system', path.basename(meta.config['brand:logo'])) : null;

				if (!sourcePath) {
					skip = true;
					return setImmediate(next);
				}

				image.resizeImage({
					path: sourcePath,
					target: uploadPath,
					extension: 'png',
					height: 50,
				}, next);
			},
			function (next) {
				if (skip) {
					return setImmediate(next);
				}

				meta.configs.setMultiple({
					'brand:logo': path.join(nconf.get('upload_path'), 'system', path.basename(meta.config['brand:logo'])),
				}, next);
			},
		], callback);
	},
};
