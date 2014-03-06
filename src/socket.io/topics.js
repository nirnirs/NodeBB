
'use strict';

var topics = require('../topics'),
	categories = require('../categories'),
	threadTools = require('../threadTools'),
	index = require('./index'),
	user = require('../user'),
	db = require('./../database'),

	async = require('async'),

	SocketTopics = {};

SocketTopics.post = function(socket, data, callback) {

	if(!data) {
		return callback(new Error('Invalid data'));
	}

	if (!socket.uid && !parseInt(meta.config.allowGuestPosting, 10)) {
		socket.emit('event:alert', {
			title: 'Post Unsuccessful',
			message: 'You don&apos;t seem to be logged in, so you cannot reply.',
			type: 'danger',
			timeout: 2000
		});
		return callback(new Error('not-logged-in'));
	}

	topics.post({uid: socket.uid, title: data.title, content: data.content, cid: data.category_id, thumb: data.topic_thumb}, function(err, result) {
		if(err) {
		 	if (err.message === 'title-too-short') {
				module.parent.exports.emitAlert(socket, 'Title too short', 'Please enter a longer title. At least ' + meta.config.minimumTitleLength + ' characters.');
			} else if (err.message === 'title-too-long') {
				module.parent.exports.emitAlert(socket, 'Title too long', 'Please enter a shorter title. Titles can\'t be longer than ' + meta.config.maximumTitleLength + ' characters.');
			} else if (err.message === 'content-too-short') {
				module.parent.exports.emitContentTooShortAlert(socket);
			} else if (err.message === 'too-many-posts') {
				module.parent.exports.emitTooManyPostsAlert(socket);
			} else if (err.message === 'no-privileges') {
				socket.emit('event:alert', {
					title: 'Unable to post',
					message: 'You do not have posting privileges in this category.',
					type: 'danger',
					timeout: 7500
				});
			} else {
				socket.emit('event:alert', {
					title: 'Error',
					message: err.message,
					type: 'warning',
					timeout: 7500
				});
			}
			return callback(err);
		}

		if (result) {
			index.server.sockets.in('category_' + data.category_id).emit('event:new_topic', result.topicData);
			index.server.sockets.in('recent_posts').emit('event:new_topic', result.topicData);
			index.server.sockets.in('user/' + socket.uid).emit('event:new_post', {
				posts: result.postData
			});

			module.parent.exports.emitTopicPostStats();

			socket.emit('event:alert', {
				title: 'Thank you for posting',
				message: 'You have successfully posted. Click here to view your post.',
				type: 'success',
				timeout: 2000
			});
			callback();
		}
	});
};

SocketTopics.postcount = function(socket, tid, callback) {
	topics.getTopicField(tid, 'postcount', callback);
};

SocketTopics.markAsRead = function(socket, data) {
	if(!data || !data.tid || !data.uid) {
		return;
	}

	topics.markAsRead(data.tid, data.uid, function(err) {
		topics.pushUnreadCount(data.uid);
	});
};

SocketTopics.markAllRead = function(socket, data, callback) {

	if (!Array.isArray(data)) {
		return callback(new Error('invalid-data'));
	}

	topics.markAllRead(socket.uid, data, function(err) {
		if(err) {
			return callback(err);
		}

		index.server.sockets.in('uid_' + socket.uid).emit('event:unread.updateCount', null, []);

		callback();
	});
};

SocketTopics.markAsUnreadForAll = function(socket, tid, callback) {
	topics.markAsUnreadForAll(tid, function(err) {
		if(err) {
			return callback(err);
		}
		db.sortedSetAdd('topics:recent', Date.now(), tid, function(err) {
			if(err) {
				return callback(err);
			}
			topics.pushUnreadCount();
			callback();
		});
	});
}

function doTopicAction(action, socket, tid, callback) {
	if(!tid) {
		return callback(new Error('Invalid tid'));
	}

	threadTools.privileges(tid, socket.uid, function(err, privileges) {
		if(err) {
			return callback(err);
		}

		if(!privileges || !privileges.editable) {
			return callback(new Error('not-allowed'));
		}

		if(threadTools[action]) {
			threadTools[action](tid, socket.uid, callback);
		}
	});
};

SocketTopics.delete = function(socket, tid, callback) {
	doTopicAction('delete', socket, tid, callback);
};

SocketTopics.restore = function(socket, tid, callback) {
	doTopicAction('restore', socket, tid, callback);
};

SocketTopics.lock = function(socket, tid, callback) {
	doTopicAction('lock', socket, tid, callback);
};

SocketTopics.unlock = function(socket, tid, callback) {
	doTopicAction('unlock', socket, tid, callback);
};

SocketTopics.pin = function(socket, tid, callback) {
	doTopicAction('pin', socket, tid, callback);
};

SocketTopics.unpin = function(socket, tid, callback) {
	doTopicAction('unpin', socket, tid, callback);
};

SocketTopics.createTopicFromPosts = function(socket, data, callback) {
	if(!socket.uid) {
		socket.emit('event:alert', {
			title: 'Can&apos;t fork',
			message: 'Guests can&apos;t fork topics!',
			type: 'warning',
			timeout: 2000
		});
		return;
	}

	if(!data || !data.title || !data.pids || !Array.isArray(data.pids)) {
		return callback(new Error('invalid data'));
	}

	topics.createTopicFromPosts(socket.uid, data.title, data.pids, callback);
};

SocketTopics.movePost = function(socket, data, callback) {
	if(!socket.uid) {
		socket.emit('event:alert', {
			title: 'Can&apos;t fork',
			message: 'Guests can&apos;t fork topics!',
			type: 'warning',
			timeout: 2000
		});
		return;
	}

	if(!data || !data.pid || !data.tid) {
		return callback(new Error('invalid data'));
	}

	threadTools.privileges(data.tid, socket.uid, function(err, privileges) {
		if(err) {
			return callback(err);
		}

		if(!(privileges.admin || privileges.moderator)) {
			return callback(new Error('not allowed'));
		}

		topics.movePostToTopic(data.pid, data.tid, callback);
	});
};

SocketTopics.move = function(socket, data, callback) {

	if(!data || !data.tid || !data.cid) {
		return callback(new Error('invalid data'));
	}

	threadTools.move(data.tid, data.cid, function(err) {
		if(err) {
			return callback(err);
		}

		index.server.sockets.in('topic_' + data.tid).emit('event:topic_moved', {
			tid: data.tid
		});

		callback(null);
	});
};

SocketTopics.followCheck = function(socket, tid, callback) {
	threadTools.isFollowing(tid, socket.uid, callback);
};

SocketTopics.follow = function(socket, tid, callback) {
	if(!socket.uid) {
		return callback(new Error('not-logged-in'));
	}


	threadTools.toggleFollow(tid, socket.uid, callback);
};

SocketTopics.loadMore = function(socket, data, callback) {
	if(!data || !data.tid || !(parseInt(data.after, 10) >= 0)) {
		return callback(new Error('invalid data'));
	}

	user.getSettings(socket.uid, function(err, settings) {

		var start = parseInt(data.after, 10),
			end = start + settings.postsPerPage - 1;

		async.parallel({
			posts: function(next) {
				topics.getTopicPosts(data.tid, start, end, socket.uid, false, next);
			},
			privileges: function(next) {
				threadTools.privileges(data.tid, socket.uid, next);
			}
		}, function(err, results) {
			callback(err, results);
		});
	});
};

SocketTopics.loadMoreRecentTopics = function(socket, data, callback) {
	if(!data || !data.term || !data.after) {
		return callback(new Error('invalid data'));
	}

	var start = parseInt(data.after, 10),
		end = start + 9;

	topics.getLatestTopics(socket.uid, start, end, data.term, callback);
};

SocketTopics.loadMoreUnreadTopics = function(socket, data, callback) {
	if(!data || !data.after) {
		return callback(new Error('invalid data'));
	}

	var start = parseInt(data.after, 10),
		end = start + 9;

	topics.getUnreadTopics(socket.uid, start, end, callback);
};

SocketTopics.loadMoreFromSet = function(socket, data, callback) {
	if(!data || !data.after || !data.set) {
		return callback(new Error('invalid data'));
	}

	var start = parseInt(data.after, 10),
		end = start + 9;

	topics.getTopicsFromSet(socket.uid, data.set, start, end, callback);
};

SocketTopics.getPageCount = function(socket, tid, callback) {
	topics.getPageCount(tid, socket.uid, callback);
};

SocketTopics.getTidPage = function(socket, tid, callback) {
	topics.getTidPage(tid, socket.uid, callback);
};

SocketTopics.getTidIndex = function(socket, tid, callback) {
	categories.getTopicIndex(tid, callback);
};

module.exports = SocketTopics;