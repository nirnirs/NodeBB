'use strict';


var async = require('async'),
	winston = require('winston'),
	S = require('string'),
	nconf = require('nconf'),

	db = require('./database'),
	user = require('./user'),
	plugins = require('./plugins'),
	meta = require('./meta'),
	emailer = require('./emailer'),
	utils = require('../public/src/utils'),
	notifications = require('./notifications'),
	userNotifications = require('./user/notifications'),
	sockets = require('./socket.io');

(function(Messaging) {

	require('./messaging/create')(Messaging);
	require('./messaging/delete')(Messaging);
	require('./messaging/edit')(Messaging);
	require('./messaging/rooms')(Messaging);
	require('./messaging/unread')(Messaging);

	Messaging.notifyQueue = {};	// Only used to notify a user of a new chat message, see Messaging.notifyUser

	var terms = {
		day: 86400000,
		week: 604800000,
		month: 2592000000,
		threemonths: 7776000000
	};

	Messaging.getMessageField = function(mid, field, callback) {
		Messaging.getMessageFields(mid, [field], function(err, fields) {
			callback(err, fields ? fields[field] : null);
		});
	};

	Messaging.getMessageFields = function(mid, fields, callback) {
		db.getObjectFields('message:' + mid, fields, callback);
	};

	Messaging.setMessageField = function(mid, field, content, callback) {
		db.setObjectField('message:' + mid, field, content, callback);
	};

	Messaging.setMessageFields = function(mid, data, callback) {
		db.setObject('message:' + mid, data, callback);
	};

	Messaging.getMessages = function(params, callback) {
		var uid = params.uid,
			roomId = params.roomId,
			since = params.since,
			isNew = params.isNew,
			count = params.count || parseInt(meta.config.chatMessageInboxSize, 10) || 250,
			markRead = params.markRead || true;

		var min = params.count ? 0 : Date.now() - (terms[since] || terms.day);

		if (since === 'recent') {
			count = 49;
			min = 0;
		}

		db.getSortedSetRevRangeByScore('uid:' + uid + ':chat:room:' + roomId + ':mids', 0, count, '+inf', min, function(err, mids) {
			if (err) {
				return callback(err);
			}

			if (!Array.isArray(mids) || !mids.length) {
				return callback(null, []);
			}

			mids.reverse();

			Messaging.getMessagesData(mids, uid, roomId, isNew, callback);
		});

		if (markRead) {
			notifications.markRead('chat_' + roomId + '_' + uid, uid, function(err) {
				if (err) {
					winston.error('[messaging] Could not mark notifications related to this chat as read: ' + err.message);
				}

				userNotifications.pushCount(uid);
			});
		}
	};

	Messaging.getMessagesData = function(mids, uid, roomId, isNew, callback) {

		var keys = mids.map(function(mid) {
			return 'message:' + mid;
		});

		var messages;

		async.waterfall([
			function (next) {
				db.getObjects(keys, next);
			},
			function (_messages, next) {
				messages = _messages.map(function(msg, idx) {
					if (msg) {
						msg.messageId = parseInt(mids[idx], 10);
					}
					return msg;
				}).filter(Boolean);

				var uids = messages.map(function(msg) {
					return msg && msg.fromuid;
				});

				user.getUsersFields(uids, ['uid', 'username', 'userslug', 'picture', 'status'], next);
			},
			function (users, next) {
				messages.forEach(function(message, index) {
					message.fromUser = users[index];
					var self = parseInt(message.fromuid, 10) === parseInt(uid, 10);
					message.self = self ? 1 : 0;
					message.timestampISO = utils.toISOString(message.timestamp);
					message.newSet = false;
					if (message.hasOwnProperty('edited')) {
						message.editedISO = new Date(parseInt(message.edited, 10)).toISOString();
					}
				});

				async.map(messages, function(message, next) {
					Messaging.parse(message.content, message.fromuid, uid, roomId, isNew, function(result) {
						message.content = result;
						message.cleanedContent = S(result).stripTags().decodeHTMLEntities().s;
						next(null, message);
					});
				}, next);
			},
			function(messages, next) {
				if (messages.length > 1) {
					// Add a spacer in between messages with time gaps between them
					messages = messages.map(function(message, index) {
						// Compare timestamps with the previous message, and check if a spacer needs to be added
						if (index > 0 && parseInt(message.timestamp, 10) > parseInt(messages[index-1].timestamp, 10) + (1000*60*5)) {
							// If it's been 5 minutes, this is a new set of messages
							message.newSet = true;
						} else if (index > 0 && message.fromuid !== messages[index-1].fromuid) {
							// If the previous message was from the other person, this is also a new set
							message.newSet = true;
						}

						return message;
					});

					next(undefined, messages);
				} else {
					// For single messages, we don't know the context, so look up the previous message and compare
					var key = 'uid:' + uid + ':chat:room:' + roomId + ':mids';
					async.waterfall([
						async.apply(db.sortedSetRank, key, messages[0].messageId),
						function(index, next) {
							// Continue only if this isn't the first message in sorted set
							if (index > 0) {
								db.getSortedSetRange(key, index-1, index-1, next);
							} else {
								messages[0].newSet = true;
								return next(undefined, messages);
							}
						},
						function(mid, next) {
							Messaging.getMessageFields(mid, ['fromuid', 'timestamp'], next);
						}
					], function(err, fields) {
						if (err) {
							return next(err);
						}

						if (
							(parseInt(messages[0].timestamp, 10) > parseInt(fields.timestamp, 10) + (1000*60*5)) ||
							(parseInt(messages[0].fromuid, 10) !== parseInt(fields.fromuid, 10))
						) {
							// If it's been 5 minutes, this is a new set of messages
							messages[0].newSet = true;
						}

						next(undefined, messages);
					});
				}
			}
		], callback);

	};

	Messaging.parse = function (message, fromuid, uid, roomId, isNew, callback) {
		plugins.fireHook('filter:parse.raw', message, function(err, parsed) {
			if (err) {
				return callback(message);
			}

			var messageData = {
				message: message,
				parsed: parsed,
				fromuid: fromuid,
				uid: uid,
				roomId: roomId,
				isNew: isNew,
				parsedMessage: parsed
			};

			plugins.fireHook('filter:messaging.parse', messageData, function(err, messageData) {
				callback(messageData.parsedMessage);
			});
		});
	};

	Messaging.isNewSet = function(uid, roomId, mid, callback) {
		var setKey = 'uid:' + uid + ':chat:room:' + roomId + ':mids';

		async.waterfall([
			async.apply(db.sortedSetRank, setKey, mid),
			function(index, next) {
				if (index > 0) {
					db.getSortedSetRange(setKey, index - 1, index, next);
				} else {
					next(null, true);
				}
			},
			function(mids, next) {
				if (typeof mids !== 'boolean' && mids && mids.length) {
					db.getObjects(['message:' + mids[0], 'message:' + mids[1]], next);
				} else {
					next(null, mids);
				}
			},
			function(messages, next) {
				if (typeof messages !== 'boolean' && messages && messages.length) {
					next(null, parseInt(messages[1].timestamp, 10) > parseInt(messages[0].timestamp, 10) + (1000*60*5));
				} else {
					next(null, messages);
				}
			}
		], callback);
	};


	Messaging.getRecentChats = function(uid, start, stop, callback) {
		db.getSortedSetRevRange('uid:' + uid + ':chat:rooms', start, stop, function(err, roomIds) {
			if (err) {
				return callback(err);
			}

			async.parallel({
				unread: function(next) {
					db.isSortedSetMembers('uid:' + uid + ':chat:rooms:unread', roomIds, next);
				},
				users: function(next) {
					async.map(roomIds, function(roomId, next) {
						db.getSortedSetRevRange('chat:room:' + roomId + ':uids', 0, 3, function(err, uids) {
							if (err) {
								return next(err);
							}
							uids = uids.filter(function(value) {
								return value && parseInt(value, 10) !== parseInt(uid, 10);
							});
							user.getUsersFields(uids, ['uid', 'username', 'picture', 'status', 'lastonline'] , next);
						});
					}, next);
				},
				teasers: function(next) {
					async.map(roomIds, function(roomId, next) {
						Messaging.getMessages({
							uid: uid,
							roomId: roomId,
							isNew: false,
							count: 1,
							markRead: false
						}, function(err, teaser) {
							teaser = teaser[0];
							teaser.content = S(teaser.content).stripTags().decodeHTMLEntities().s;
							next(err, teaser);
						});
					}, next);
				}
			}, function(err, results) {
				if (err) {
					return callback(err);
				}
				var rooms = results.users.map(function(users, index) {
					var data = {
						users: users,
						unread: results.unread[index],
						roomId: roomIds[index],
						teaser: results.teasers[index]
					};
					data.users.forEach(function(userData) {
						if (userData && parseInt(userData.uid, 10)) {
							userData.status = user.getStatus(userData);
						}
					});
					data.users = data.users.filter(function(user) {
						return user && parseInt(user.uid, 10);
					});
					return data;
				});

				callback(null, {rooms: rooms, nextStart: stop + 1});
			});
		});
	};



	Messaging.notifyUser = function(uid, roomId, messageObj) {
		// Immediate notifications
		// Recipient
		Messaging.pushUnreadCount(touid);
		sockets.in('uid_' + touid).emit('event:chats.receive', {
			withUid: fromuid,
			message: messageObj,
			self: 0
		});
		// Sender
		Messaging.pushUnreadCount(fromuid);
		sockets.in('uid_' + fromuid).emit('event:chats.receive', {
			withUid: touid,
			message: messageObj,
			self: 1
		});

		// Delayed notifications
		var queueObj = Messaging.notifyQueue[fromuid + ':' + touid];
		if (queueObj) {
			queueObj.message.content += '\n' + messageObj.content;
			clearTimeout(queueObj.timeout);
		} else {
			queueObj = Messaging.notifyQueue[fromuid + ':' + touid] = {
				message: messageObj
			};
		}

		queueObj.timeout = setTimeout(function() {
			sendNotifications(fromuid, touid, queueObj.message, function(err) {
				if (!err) {
					delete Messaging.notifyQueue[fromuid + ':' + touid];
				}
			});
		}, 1000*60);	// wait 60s before sending
	};

	Messaging.canMessage = function(uid, roomId, callback) {
		if (parseInt(meta.config.disableChat) === 1 || !uid) {
			return callback(null, false);
		}

		async.waterfall([
			function (next) {
				Messaging.isUserInRoom(uid, roomId, next);
			},
			function (inRoom, next) {
				if (!inRoom) {
					return callback(null, false);
				}
				user.getUserFields(uid, ['banned', 'email:confirmed'], next);
			},
			function (userData, next) {
				if (parseInt(userData.banned, 10) === 1) {
					return callback(null, false);
				}

				if (parseInt(meta.config.requireEmailConfirmation, 10) === 1 && parseInt(userData['email:confirmed'], 10) !== 1) {
					return callback(null, false);
				}

				next(null, true);
			}
		], callback);
	};


	function sendNotifications(fromuid, touid, messageObj, callback) {
		user.isOnline(touid, function(err, isOnline) {
			if (err || isOnline) {
				return callback(err);
			}

			notifications.create({
				bodyShort: '[[notifications:new_message_from, ' + messageObj.fromUser.username + ']]',
				bodyLong: messageObj.content,
				nid: 'chat_' + fromuid + '_' + touid,
				from: fromuid,
				path: '/chats/' + messageObj.fromUser.username
			}, function(err, notification) {
				if (!err && notification) {
					notifications.push(notification, [touid], callback);
				}
			});

			user.getSettings(messageObj.toUser.uid, function(err, settings) {
				if (settings.sendChatNotifications && !parseInt(meta.config.disableEmailSubscriptions, 10)) {
					emailer.send('notif_chat', touid, {
						subject: '[[email:notif.chat.subject, ' + messageObj.fromUser.username + ']]',
						username: messageObj.toUser.username,
						userslug: utils.slugify(messageObj.toUser.username),
						summary: '[[notifications:new_message_from, ' + messageObj.fromUser.username + ']]',
						message: messageObj,
						site_title: meta.config.title || 'NodeBB',
						url: nconf.get('url'),
						fromUserslug: utils.slugify(messageObj.fromUser.username)
					});
				}
			});
		});
	}

}(exports));
