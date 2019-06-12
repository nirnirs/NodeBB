
'use strict';

var async = require('async');
var winston = require('winston');
var _ = require('lodash');

var db = require('../database');
var meta = require('../meta');
var notifications = require('../notifications');
var privileges = require('../privileges');
var utils = require('../utils');

var UserNotifications = module.exports;

UserNotifications.get = function (uid, callback) {
	if (parseInt(uid, 10) <= 0) {
		return setImmediate(callback, null, { read: [], unread: [] });
	}

	let unread;
	async.waterfall([
		function (next) {
			getNotificationsFromSet('uid:' + uid + ':notifications:unread', uid, 0, 29, next);
		},
		function (_unread, next) {
			unread = _unread.filter(Boolean);
			if (unread.length < 30) {
				getNotificationsFromSet('uid:' + uid + ':notifications:read', uid, 0, 29 - unread.length, next);
			} else {
				next(null, []);
			}
		},
		function (read, next) {
			next(null, {
				read: read.filter(Boolean),
				unread: unread,
			});
		},
	], callback);
};

function filterNotifications(nids, filter, callback) {
	if (!filter) {
		return setImmediate(callback, null, nids);
	}
	async.waterfall([
		function (next) {
			const keys = nids.map(nid => 'notifications:' + nid);
			db.getObjectsFields(keys, ['nid', 'type'], next);
		},
		function (notifications, next) {
			nids = notifications.filter(n => n && n.nid && n.type === filter).map(n => n.nid);
			next(null, nids);
		},
	], callback);
}

UserNotifications.getAll = function (uid, filter, callback) {
	var nids;
	async.waterfall([
		function (next) {
			db.getSortedSetRevRange([
				'uid:' + uid + ':notifications:unread',
				'uid:' + uid + ':notifications:read',
			], 0, -1, next);
		},
		function (_nids, next) {
			nids = _.uniq(_nids);
			db.isSortedSetMembers('notifications', nids, next);
		},
		function (exists, next) {
			var deleteNids = [];

			nids = nids.filter(function (nid, index) {
				if (!nid || !exists[index]) {
					deleteNids.push(nid);
				}
				return nid && exists[index];
			});

			deleteUserNids(deleteNids, uid, next);
		},
		function (next) {
			filterNotifications(nids, filter, next);
		},
	], callback);
};

function deleteUserNids(nids, uid, callback) {
	callback = callback || function () {};
	if (!nids.length) {
		return setImmediate(callback);
	}
	db.sortedSetRemove([
		'uid:' + uid + ':notifications:read',
		'uid:' + uid + ':notifications:unread',
	], nids, callback);
}

function getNotificationsFromSet(set, uid, start, stop, callback) {
	async.waterfall([
		function (next) {
			db.getSortedSetRevRange(set, start, stop, next);
		},
		function (nids, next) {
			UserNotifications.getNotifications(nids, uid, next);
		},
	], callback);
}

UserNotifications.getNotifications = function (nids, uid, callback) {
	if (!Array.isArray(nids) || !nids.length) {
		return callback(null, []);
	}

	var notificationData = [];
	async.waterfall([
		function (next) {
			async.parallel({
				notifications: function (next) {
					notifications.getMultiple(nids, next);
				},
				hasRead: function (next) {
					db.isSortedSetMembers('uid:' + uid + ':notifications:read', nids, next);
				},
			}, next);
		},
		function (results, next) {
			var deletedNids = [];
			notificationData = results.notifications.filter(function (notification, index) {
				if (!notification || !notification.nid) {
					deletedNids.push(nids[index]);
				}
				if (notification) {
					notification.read = results.hasRead[index];
					notification.readClass = !notification.read ? 'unread' : '';
				}

				return notification && notification.path;
			});

			deleteUserNids(deletedNids, uid, next);
		},
		function (next) {
			notifications.merge(notificationData, next);
		},
	], callback);
};

UserNotifications.getDailyUnread = function (uid, callback) {
	var yesterday = Date.now() - (1000 * 60 * 60 * 24);	// Approximate, can be more or less depending on time changes, makes no difference really.

	async.waterfall([
		function (next) {
			db.getSortedSetRevRangeByScore('uid:' + uid + ':notifications:unread', 0, 20, '+inf', yesterday, next);
		},
		function (nids, next) {
			UserNotifications.getNotifications(nids, uid, next);
		},
	], callback);
};

UserNotifications.getUnreadCount = function (uid, callback) {
	if (parseInt(uid, 10) <= 0) {
		return setImmediate(callback, null, 0);
	}

	async.waterfall([
		function (next) {
			db.getSortedSetRevRange('uid:' + uid + ':notifications:unread', 0, 99, next);
		},
		function (nids, next) {
			notifications.filterExists(nids, next);
		},
		function (nids, next) {
			const keys = nids.map(nid => 'notifications:' + nid);
			db.getObjectsFields(keys, ['mergeId'], next);
		},
		function (mergeIds, next) {
			// Collapse any notifications with identical mergeIds
			mergeIds = mergeIds.map(set => set.mergeId);

			next(null, mergeIds.reduce(function (count, mergeId, idx, arr) {
				// A missing (null) mergeId means that notification is counted separately.
				if (mergeId === null || idx === arr.indexOf(mergeId)) {
					count += 1;
				}

				return count;
			}, 0));
		},
	], callback);
};

UserNotifications.getUnreadByField = function (uid, field, values, callback) {
	var nids;
	async.waterfall([
		function (next) {
			db.getSortedSetRevRange('uid:' + uid + ':notifications:unread', 0, 99, next);
		},
		function (_nids, next) {
			nids = _nids;
			if (!nids.length) {
				return callback(null, []);
			}

			const keys = nids.map(nid => 'notifications:' + nid);
			db.getObjectsFields(keys, ['nid', field], next);
		},
		function (notifications, next) {
			const valuesSet = new Set(values.map(value => String(value)));
			nids = notifications.filter(n => n && n[field] && valuesSet.has(String(n[field]))).map(n => n.nid);
			next(null, nids);
		},
	], callback);
};

UserNotifications.deleteAll = function (uid, callback) {
	if (parseInt(uid, 10) <= 0) {
		return setImmediate(callback);
	}
	db.deleteAll([
		'uid:' + uid + ':notifications:unread',
		'uid:' + uid + ':notifications:read',
	], callback);
};

UserNotifications.sendTopicNotificationToFollowers = function (uid, topicData, postData) {
	var followers;
	async.waterfall([
		function (next) {
			db.getSortedSetRange('followers:' + uid, 0, -1, next);
		},
		function (followers, next) {
			privileges.categories.filterUids('read', topicData.cid, followers, next);
		},
		function (_followers, next) {
			followers = _followers;
			if (!followers.length) {
				return;
			}

			var title = topicData.title;
			if (title) {
				title = utils.decodeHTMLEntities(title);
			}

			notifications.create({
				type: 'new-topic',
				bodyShort: '[[notifications:user_posted_topic, ' + postData.user.username + ', ' + title + ']]',
				bodyLong: postData.content,
				pid: postData.pid,
				path: '/post/' + postData.pid,
				nid: 'tid:' + postData.tid + ':uid:' + uid,
				tid: postData.tid,
				from: uid,
			}, next);
		},
	], function (err, notification) {
		if (err) {
			return winston.error(err);
		}

		if (notification) {
			notifications.push(notification, followers);
		}
	});
};

UserNotifications.sendWelcomeNotification = function (uid, callback) {
	callback = callback || function () {};
	if (!meta.config.welcomeNotification) {
		return callback();
	}

	var path = meta.config.welcomeLink ? meta.config.welcomeLink : '#';

	async.waterfall([
		function (next) {
			notifications.create({
				bodyShort: meta.config.welcomeNotification,
				path: path,
				nid: 'welcome_' + uid,
				from: meta.config.welcomeUid ? meta.config.welcomeUid : null,
			}, next);
		},
		function (notification, next) {
			if (!notification) {
				return next();
			}
			notifications.push(notification, [uid], next);
		},
	], callback);
};

UserNotifications.sendNameChangeNotification = function (uid, username) {
	notifications.create({
		bodyShort: '[[user:username_taken_workaround, ' + username + ']]',
		image: 'brand:logo',
		nid: 'username_taken:' + uid,
		datetime: Date.now(),
	}, function (err, notification) {
		if (!err && notification) {
			notifications.push(notification, uid);
		}
	});
};

UserNotifications.pushCount = function (uid) {
	var websockets = require('./../socket.io');
	UserNotifications.getUnreadCount(uid, function (err, count) {
		if (err) {
			return winston.error(err.stack);
		}

		websockets.in('uid_' + uid).emit('event:notifications.updateCount', count);
	});
};
