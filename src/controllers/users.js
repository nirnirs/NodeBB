"use strict";

var async = require('async');
var user = require('../user');
var meta = require('../meta');

var pagination = require('../pagination');
var plugins = require('../plugins');
var db = require('../database');
var helpers = require('./helpers');


var usersController = {};

usersController.getOnlineUsers = function(req, res, next) {

	async.parallel({
		userData: function(next) {
			usersController.getUsers('users:online', req.uid, req.query.page, next);
		},
		isAdministrator: function(next) {
			user.isAdministrator(req.uid, next);
		}
	}, function(err, results) {
		if (err) {
			return next(err);
		}

		if (!results.isAdministrator) {
			results.userData.users = results.userData.users.filter(function(user) {
				return user && user.status !== 'offline';
			});
		}

		results.userData.anonymousUserCount = require('../socket.io').getOnlineAnonCount();

		render(req, res, results.userData, next);
	});
};

usersController.getUsersSortedByPosts = function(req, res, next) {
	usersController.renderUsersPage('users:postcount', req, res, next);
};

usersController.getUsersSortedByReputation = function(req, res, next) {
	if (parseInt(meta.config['reputation:disabled'], 10) === 1) {
		return next();
	}
	usersController.renderUsersPage('users:reputation', req, res, next);
};

usersController.getUsersSortedByJoinDate = function(req, res, next) {
	usersController.renderUsersPage('users:joindate', req, res, next);
};

usersController.renderUsersPage = function(set, req, res, next) {
	usersController.getUsers(set, req.uid, req.query.page, function(err, userData) {
		if (err) {
			return next(err);
		}
		render(req, res, userData, next);
	});
};

usersController.getUsers = function(set, uid, page, callback) {
	var setToTitles = {
		'users:postcount': '[[pages:users/sort-posts]]',
		'users:reputation': '[[pages:users/sort-reputation]]',
		'users:joindate': '[[pages:users/latest]]',
		'users:online': '[[pages:users/online]]'
	};

	var setToCrumbs = {
		'users:postcount': '[[users:top_posters]]',
		'users:reputation': '[[users:most_reputation]]',
		'users:joindate': '[[global:users]]',
		'usesr:online': '[[global:online]]'
	};

	var breadcrumbs = [{text: setToCrumbs[set]}];

	if (set !== 'users:joindate') {
		breadcrumbs.unshift({text: '[[global:users]]', url: '/users'});
	}

	page = parseInt(page, 10) || 1;
	var resultsPerPage = parseInt(meta.config.userSearchResultsPerPage, 10) || 20;
	var start = Math.max(0, page - 1) * resultsPerPage;
	var stop = start + resultsPerPage - 1;

	usersController.getUsersAndCount(set, uid, start, stop, function(err, data) {
		if (err) {
			return callback(err);
		}

		var pageCount = Math.ceil(data.count / resultsPerPage);
		var userData = {
			loadmore_display: data.count > (stop - start + 1) ? 'block' : 'hide',
			users: data.users,
			pagination: pagination.create(page, pageCount),
			title: setToTitles[set] || '[[pages:users/latest]]',
			breadcrumbs: helpers.buildBreadcrumbs(breadcrumbs)
		};
		userData['route_' + set] = true;
		callback(null, userData);
	});
};

usersController.getUsersAndCount = function(set, uid, start, stop, callback) {
	async.parallel({
		users: function(next) {
			user.getUsersFromSet(set, uid, start, stop, next);
		},
		count: function(next) {
			if (set === 'users:online') {
				var now = Date.now();
				db.sortedSetCount('users:online', now - 300000, now, next);
			} else {
				db.getObjectField('global', 'userCount', next);
			}
		}
	}, function(err, results) {
		if (err) {
			return callback(err);
		}
		results.users = results.users.filter(function(user) {
			return user && parseInt(user.uid, 10);
		});

		callback(null, results);
	});
};

function render(req, res, data, next) {
	plugins.fireHook('filter:users.build', { req: req, res: res, templateData: data }, function(err, data) {
		if (err) {
			return next(err);
		}

		var registrationType = meta.config.registrationType;

		data.templateData.maximumInvites = meta.config.maximumInvites;
		data.templateData.inviteOnly = registrationType === 'invite-only' || registrationType === 'admin-invite-only';
		data.templateData.adminInviteOnly = registrationType === 'admin-invite-only';
		data.templateData['reputation:disabled'] = parseInt(meta.config['reputation:disabled'], 10) === 1;

		user.getInvitesNumber(req.uid, function(err, num) {
			if (err) {
				return next(err);
			}

			data.templateData.invites = num;
			res.render('users', data.templateData);
		});

	});
}

module.exports = usersController;
