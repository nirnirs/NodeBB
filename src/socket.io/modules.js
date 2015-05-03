"use strict";

var	nconf = require('nconf'),
	async = require('async'),
	S = require('string'),
	winston = require('winston'),
	_ = require('underscore'),

	posts = require('../posts'),
	postTools = require('../postTools'),
	topics = require('../topics'),
	meta = require('../meta'),
	Messaging = require('../messaging'),
	user = require('../user'),
	plugins = require('../plugins'),
	utils = require('../../public/src/utils'),
	privileges = require('../privileges'),

	server = require('./'),


	SocketModules = {
		composer: {},
		chats: {},
		sounds: {},
		settings: {}
	};

/* Posts Composer */

SocketModules.composer.push = function(socket, pid, callback) {
	privileges.posts.can('read', pid, socket.uid, function(err, canRead) {
		if (err || !canRead) {
			return callback(err || new Error('[[error:no-privileges]]'));
		}
		posts.getPostFields(pid, ['content', 'tid', 'uid', 'handle'], function(err, postData) {
			if(err || (!postData && !postData.content)) {
				return callback(err || new Error('[[error:invalid-pid]]'));
			}

			async.parallel({
				topic: function(next) {
					topics.getTopicDataByPid(pid, next);
				},
				tags: function(next) {
					topics.getTopicTags(postData.tid, next);
				},
				isMain: function(next) {
					posts.isMain(pid, next);
				}
			}, function(err, results) {
				if(err) {
					return callback(err);
				}

				if (!results.topic) {
					return callback(new Error('[[error:no-topic]]'));
				}

				callback(null, {
					pid: pid,
					uid: postData.uid,
					handle: parseInt(meta.config.allowGuestHandles, 10) ? postData.handle : undefined,
					body: postData.content,
					title: results.topic.title,
					topic_thumb: results.topic.thumb,
					tags: results.tags,
					isMain: results.isMain
				});
			});
		});
	});
};

SocketModules.composer.editCheck = function(socket, pid, callback) {
	posts.isMain(pid, function(err, isMain) {
		callback(err, {
			titleEditable: isMain
		});
	});
};

SocketModules.composer.renderPreview = function(socket, content, callback) {
	plugins.fireHook('filter:parse.raw', content, callback);
};

SocketModules.composer.renderHelp = function(socket, data, callback) {
	var helpText = meta.config['composer:customHelpText'] || '';

	if (meta.config['composer:showHelpTab'] === '0') {
		return callback(new Error('help-hidden'));
	}

	plugins.fireHook('filter:parse.raw', helpText, function(err, helpText) {
		if (!meta.config['composer:allowPluginHelp'] || meta.config['composer:allowPluginHelp'] === '1') {
			plugins.fireHook('filter:composer.help', helpText, callback);
		} else {
			callback(null, helpText);
		}
	});
};

SocketModules.composer.notifyTyping = function(socket, data) {
	if (!socket.uid || !parseInt(data.tid, 10)) {
		return;
	}
	server.in('topic_' + data.tid).emit('event:topic.notifyTyping', data);
};

SocketModules.composer.stopNotifyTyping = function(socket, data) {
	if (!socket.uid || !parseInt(data.tid, 10)) {
		return;
	}
	server.in('topic_' + data.tid).emit('event:topic.stopNotifyTyping', data);
};

SocketModules.composer.getFormattingOptions = function(socket, data, callback) {
	plugins.fireHook('filter:composer.formatting', {
		options: [
			{ name: 'tags', className: 'fa fa-tags', mobile: true }
		]
	}, function(err, payload) {
		callback(err, payload.options);
	});
};

/* Chat */

SocketModules.chats.get = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('[[error:invalid-data]]'));
	}

	Messaging.getMessages(socket.uid, data.touid, data.since, false, callback);
};

SocketModules.chats.send = function(socket, data, callback) {
	if (!data) {
		return callback(new Error('[[error:invalid-data]]'));
	}

	var now = Date.now(),
		touid = parseInt(data.touid, 10);

	// Websocket rate limiting
	socket.lastChatMessageTime = socket.lastChatMessageTime || 0;
	if (now - socket.lastChatMessageTime < 200) {
		return callback(new Error('[[error:too-many-messages]]'));
	} else {
		socket.lastChatMessageTime = now;
	}

	Messaging.canMessage(socket.uid, touid, function(err, allowed) {
		if (err || !allowed) {
			return callback(err || new Error('[[error:chat-restricted]]'));
		}

		Messaging.addMessage(socket.uid, touid, data.message, function(err, message) {
			if (err) {
				return callback(err);
			}

			Messaging.notifyUser(socket.uid, touid, message);

			callback();
		});
	});
};

SocketModules.chats.canMessage = function(socket, toUid, callback) {
	Messaging.canMessage(socket.uid, toUid, function(err, allowed) {
		callback(!allowed ? new Error('[[error:chat-restricted]]') : undefined);
	});
};

SocketModules.chats.markRead = function(socket, touid, callback) {
	Messaging.markRead(socket.uid, touid, function(err) {
		if (!err) {
			Messaging.pushUnreadCount(socket.uid);
		}
	});
};

SocketModules.chats.userStartTyping = function(socket, data, callback) {
	sendTypingNotification('event:chats.userStartTyping', socket, data, callback);
};

SocketModules.chats.userStopTyping = function(socket, data, callback) {
	sendTypingNotification('event:chats.userStopTyping', socket, data, callback);
};

function sendTypingNotification(event, socket, data, callback) {
	if (!socket.uid || !data) {
		return;
	}
	server.in('uid_' + data.touid).emit(event, data.fromUid);
}

SocketModules.chats.getRecentChats = function(socket, data, callback) {
	if (!data || !utils.isNumber(data.after)) {
		return callback(new Error('[[error:invalid-data]]'));
	}
	var start = parseInt(data.after, 10),
		stop = start + 9;

	Messaging.getRecentChats(socket.uid, start, stop, callback);
};


/* Sounds */
SocketModules.sounds.getSounds = function(socket, data, callback) {
	// Read sounds from local directory
	meta.sounds.getFiles(callback);
};

SocketModules.sounds.getMapping = function(socket, data, callback) {
	meta.sounds.getMapping(callback);
};

module.exports = SocketModules;
