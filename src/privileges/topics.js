
'use strict';

var async = require('async'),

	topics = require('../topics'),
	user = require('../user'),
	helpers = require('./helpers'),
	groups = require('../groups'),
	categories = require('../categories');

module.exports = function(privileges) {

	privileges.topics = {};

	privileges.topics.get = function(tid, uid, callback) {

		topics.getTopicField(tid, 'cid', function(err, cid) {
			if (err) {
				return callback(err);
			}

			async.parallel({
				'topics:reply': function(next) {
					helpers.allowedTo('topics:reply', uid, cid, next);
				},
				read: function(next) {
					helpers.allowedTo('read', uid, cid, next);
				},
				isOwner: function(next) {
					topics.isOwner(tid, uid, next);
				},
				manage_topic: function(next) {
					helpers.hasEnoughReputationFor('privileges:manage_topic', uid, next);
				},
				isAdministrator: function(next) {
					user.isAdministrator(uid, next);
				},
				isModerator: function(next) {
					user.isModerator(uid, cid, next);
				}
			}, function(err, results) {
				if(err) {
					return callback(err);
				}
				var	isAdminOrMod = results.isAdministrator || results.isModerator;
				var editable =  isAdminOrMod || results.manage_topic;
				var deletable = isAdminOrMod || results.isOwner;

				callback(null, {
					'topics:reply': results['topics:reply'],
					read: results.read,
					view_thread_tools: editable || deletable,
					editable: editable,
					deletable: deletable,
					view_deleted: isAdminOrMod || results.manage_topic || results.isOwner
				});
			});
		});
	};

	privileges.topics.can = function(privilege, tid, uid, callback) {
		topics.getTopicField(tid, 'cid', function(err, cid) {
			if (err) {
				return callback(err);
			}

			privileges.categories.can(privilege, cid, uid, callback);
		});
	};

	privileges.topics.canEdit = function(tid, uid, callback) {
		helpers.some([
			function(next) {
				topics.isOwner(tid, uid, next);
			},
			function(next) {
				helpers.hasEnoughReputationFor('privileges:manage_topic', uid, next);
			},
			function(next) {
				isAdminOrMod(tid, uid, next);
			}
		], callback);
	};

	privileges.topics.canMove = function(tid, uid, callback) {
		isAdminOrMod(tid, uid, callback);
	};

	function isAdminOrMod(tid, uid, callback) {
		helpers.some([
			function(next) {
				topics.getTopicField(tid, 'cid', function(err, cid) {
					if (err) {
						return next(err);
					}
					user.isModerator(uid, cid, next);
				});
			},
			function(next) {
				user.isAdministrator(uid, next);
			}
		], callback);
	}
};
