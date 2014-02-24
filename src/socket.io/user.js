var	async = require('async'),
	user = require('../user'),
	topics = require('../topics'),
	utils = require('./../../public/src/utils'),
	SocketUser = {};

SocketUser.exists = function(socket, data, callback) {
	if (data && data.username) {
		user.exists(utils.slugify(data.username), callback);
	}
};

SocketUser.count = function(socket, data, callback) {
	user.count(callback);
};

SocketUser.emailExists = function(socket, data, callback) {
	if(data && data.email) {
		user.email.exists(data.email, callback);
	}
};

SocketUser.search = function(socket, username, callback) {
	user.search(username, callback);
};

// Password Reset
SocketUser.reset = {};

SocketUser.reset.send = function(socket, data, callback) {
	if(data && data.email) {
		user.reset.send(socket, data.email, callback);
	}
};

SocketUser.reset.valid = function(socket, data, callback) {
	if(data && data.code) {
		user.reset.validate(socket, data.code, callback);
	}
};

SocketUser.reset.commit = function(socket, data, callback) {
	if(data && data.code && data.password) {
		user.reset.commit(socket, data.code, data.password, callback);
	}
};

SocketUser.isOnline = function(socket, uid, callback) {
	user.getUserField(uid, 'status', function(err, status) {
		if(err) {
			return callback(err);
		}

		if(!status) {
			status = 'online';
		}

		var online = module.parent.exports.isUserOnline(uid);

		if(!online) {
			status = 'offline';
		}

		if(status === 'offline') {
			online = false;
		}

		callback(null, {
			online: online,
			uid: uid,
			timestamp: Date.now(),
			status: status
		});
	});
};

SocketUser.changePassword = function(socket, data, callback) {
	if(data) {
		user.changePassword(socket.uid, data, callback);
	}
};

SocketUser.updateProfile = function(socket, data, callback) {
	if(!data || !data.uid) {
		return callback(new Error('invalid-data'));
	}

	if(socket.uid === parseInt(data.uid, 10)) {
		return user.updateProfile(socket.uid, data, callback);
	}

	user.isAdministrator(socket.uid, function(err, isAdmin) {
		if(err) {
			return callback(err);
		}
		if(!isAdmin) {
			return callback(new Error('not allowed!'))
		}

		user.updateProfile(data.uid, data, callback);
	});
};

SocketUser.changePicture = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid-data'));
	}

	var type = data.type;

	function updateHeader(callback) {
		user.getUserFields(socket.uid, ['picture'], function(err, fields) {
			if(err) {
				return callback(err);
			}

			if (fields) {
				fields.uid = socket.uid;
				socket.emit('meta.updateHeader', null, fields);
			}

			callback();
		});
	}

	function changePicture(uid, callback) {
		user.getUserField(uid, type, function(err, picture) {
			if(err) {
				return callback(err);
			}

			user.setUserField(uid, 'picture', picture, callback);
		});
	}

	if (type === 'gravatar') {
		type = 'gravatarpicture';
	} else if (type === 'uploaded') {
		type = 'uploadedpicture';
	} else {
		return callback(new Error('invalid-image-type'));
	}

	if(socket.uid === parseInt(data.uid, 10)) {
		changePicture(socket.uid, function(err) {
			if(err) {
				return callback(err);
			}
			updateHeader(callback);
		});
		return;
	}

	user.isAdministrator(socket.uid, function(err, isAdmin) {
		if(err) {
			return callback(err);
		}

		if(!isAdmin) {
			return callback(new Error('not-allowed'));
		}

		changePicture(data.uid, callback);
	});
};

SocketUser.follow = function(socket, data, callback) {
	if (socket.uid && data) {
		user.follow(socket.uid, data.uid, callback);
	}
};

SocketUser.unfollow = function(socket, data, callback) {
	if (socket.uid && data) {
		user.unfollow(socket.uid, data.uid, callback);
	}
};

SocketUser.getSettings = function(socket, data, callback) {
	if (socket.uid) {
		user.getSettings(socket.uid, callback);
	}
};

SocketUser.saveSettings = function(socket, data, callback) {
	if (socket.uid && data) {
		user.saveSettings(socket.uid, data, callback);
	}
};

SocketUser.getOnlineUsers = function(socket, data, callback) {
	var returnData = {};
	if(!data) {
		return callback(new Error('invalid-data'));
	}

	function getUserStatus(uid, next) {
		SocketUser.isOnline(socket, uid, function(err, data) {
			if(err) {
				return next(err);
			}
			returnData[uid] = data;
			next();
		});
	}

	async.each(data, getUserStatus, function(err) {
		callback(err, returnData);
	});
};

SocketUser.getOnlineAnonCount = function(socket, data, callback) {
	callback(null, module.parent.exports.getOnlineAnonCount());
};

SocketUser.getUnreadCount = function(socket, data, callback) {
	topics.getUnreadTids(socket.uid, 0, 19, callback);
};

SocketUser.getActiveUsers = function(socket, data, callback) {
	module.parent.exports.emitOnlineUserCount(callback);
};

SocketUser.loadMore = function(socket, data, callback) {
	if(!data || !data.set || parseInt(data.after, 10) < 0) {
		return callback(new Error('invalid-data'));
	}

	var start = data.after,
		end = start + 19;

	user.getUsers(data.set, start, end, function(err, userData) {
		if(err) {
			return callback(err);
		}

		user.isAdministrator(socket.uid, function (err, isAdministrator) {
			if(err) {
				return callback(err);
			}

			if(!isAdministrator && data.set === 'users:online') {
				userData = userData.filter(function(item) {
					return item.status !== 'offline';
				});
			}

			callback(null, {
				users: userData
			});
		});
	});
};



SocketUser.setStatus = function(socket, status, callback) {
	var server = require('./index');
	user.setUserField(socket.uid, 'status', status, function(err) {
		SocketUser.isOnline(socket, socket.uid, function(err, data) {
			server.server.sockets.emit('user.isOnline', err, data);
			callback(err, data);
		});
	});
};

/* Exports */

module.exports = SocketUser;