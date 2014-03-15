"use strict";

var usersController = {};

var async = require('async'),
	user = require('./../user'),
	db = require('./../database');

usersController.getOnlineUsers = function(req, res, next) {
	var	websockets = require('../socket.io');

	user.getUsers('users:online', 0, 49, function (err, data) {
		if(err) {
			return next(err);
		}
		var onlineUsers = [],
			uid = 0;

		if (req.user) {
			uid = req.user.uid;
		}

		user.isAdministrator(uid, function (err, isAdministrator) {
			if(err) {
				return next(err);
			}

			if (!isAdministrator) {
				data = data.filter(function(item) {
					return item.status !== 'offline';
				});
			}

			function iterator(userData, next) {
				var online = websockets.isUserOnline(userData.uid);
				if(!online) {
					db.sortedSetRemove('users:online', userData.uid);
					return next(null);
				}

				onlineUsers.push(userData);
				next(null);
			}

			var anonymousUserCount = websockets.getOnlineAnonCount();

			async.each(data, iterator, function(err) {
				var userData = {
					search_display: 'none',
					loadmore_display: 'block',
					users: onlineUsers,
					anonymousUserCount: anonymousUserCount,
					show_anon: anonymousUserCount?'':'hide'
				};

				res.render('users', userData);
			});
		});
	});
};

usersController.getUsersSortedByPosts = function(req, res, next) {
	getUsers('users:postcount', res, next);
};

usersController.getUsersSortedByReputation = function(req, res, next) {
	getUsers('users:reputation', res, next);
};

usersController.getUsersSortedByJoinDate = function(req, res, next) {
	getUsers('users:joindate', res, next);
};

function getUsers(set, res, next) {
	user.getUsers(set, 0, 49, function (err, data) {
		if (err) {
			return next(err);
		}
		var userData = {
			search_display: 'none',
			loadmore_display: 'block',
			users: data,
			show_anon: 'hide'
		};

		res.render('users', userData);
	});
}

usersController.getUsersForSearch = function(req, res, next) {
	var data = {
		search_display: 'block',
		loadmore_display: 'none',
		users: [],
		show_anon: 'hide'
	};

	res.render('users', data);
};



module.exports = usersController;