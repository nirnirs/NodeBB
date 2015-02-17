"use strict";

var user = require('../../user'),
	meta = require('../../meta');


var usersController = {};

usersController.search = function(req, res, next) {
	res.render('admin/manage/users', {
		search_display: '',
		loadmore_display: 'hide',
		users: []
	});
};

usersController.sortByPosts = function(req, res, next) {
	getUsers('users:postcount', req, res, next);
};

usersController.sortByReputation = function(req, res, next) {
	getUsers('users:reputation', req, res, next);
};

usersController.sortByJoinDate = function(req, res, next) {
	getUsers('users:joindate', req, res, next);
};

usersController.banned = function(req, res, next) {
	getUsers('users:banned', req, res, next);
};

function getUsers(set, req, res, next) {
	var uid = req.user ? parseInt(req.user.uid, 10) : 0;
	user.getUsersFromSet(set, uid, 0, 49, function(err, users) {
		if (err) {
			return next(err);
		}

		users = users.filter(function(user) {
			return user && parseInt(user.uid, 10);
		});

		res.render('admin/manage/users', {
			search_display: 'hidden',
			loadmore_display: 'block',
			users: users,
			yourid: req.user.uid,
			requireEmailConfirmation: parseInt(meta.config.requireEmailConfirmation, 10) === 1
		});
	});
}

usersController.getCSV = function(req, res, next) {
	user.getUsersCSV(function(err, data) {
		if (err) {
			return next(err);
		}
		res.attachment('users.csv');
		res.setHeader('Content-Type', 'text/csv');
		res.end(data);
	});
};

module.exports = usersController;
