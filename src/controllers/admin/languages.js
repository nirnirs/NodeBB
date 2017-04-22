'use strict';

var languages = require('../../languages');
var meta = require('../../meta');

var languagesController = {};


languagesController.get = function (req, res, next) {
	languages.list(function (err, languages) {
		if (err) {
			return next(err);
		}

		languages.forEach(function (language) {
			language.selected = language.code === (meta.config.defaultLang || 'en-GB');
		});

		res.render('admin/general/languages', {
			languages: languages,
			autoDetectLang: parseInt(meta.config.autoDetectLang, 10) === 1,
		});
	});
};

module.exports = languagesController;
