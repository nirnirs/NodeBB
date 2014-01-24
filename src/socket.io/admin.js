"use strict";

var	groups = require('../groups'),
	meta = require('../meta'),
	plugins = require('../plugins'),
	user = require('../user'),
	topics = require('../topics'),
	categories = require('../categories'),
	CategoryTools = require('../categoryTools'),
	logger = require('../logger'),
	admin = {
		user: require('../admin/user'),
		categories: require('../admin/categories')
	},

	async = require('async'),
	winston = require('winston'),
	index = require('./index'),

	SocketAdmin = {};

SocketAdmin.before = function(socket, next) {
	// Verify administrative privileges
	user.isAdministrator(socket.uid, function(err, isAdmin) {
		if (isAdmin) {
			next();
		} else {
			winston.warn('[socket.io] Call to admin method blocked (accessed by uid ' + socket.uid + ')');
		}
	});
};

/* Topics */

SocketAdmin.topics = {};

SocketAdmin.topics.getMore = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid data'));
	}

	topics.getAllTopics(data.limit, data.after, callback);
};

/* User */

SocketAdmin.user = {};

SocketAdmin.user.makeAdmin = function(socket, theirid) {
	admin.user.makeAdmin(socket.uid, theirid, socket);
};

SocketAdmin.user.removeAdmin = function(socket, theirid) {
	admin.user.removeAdmin(socket.uid, theirid, socket);
};

SocketAdmin.user.createUser = function(socket, user, callback) {
	if(!user) {
		return callback(new Error('invalid data'));
	}
	admin.user.createUser(socket.uid, user, callback);
};

SocketAdmin.user.banUser = function(socket, theirid) {
	admin.user.banUser(socket.uid, theirid, socket, function(isBanned) {
		if(isBanned) {
			if(index.userSockets[theirid]) {
				for(var i=0; i<index.userSockets[theirid].length; ++i) {
					index.userSockets[theirid][i].emit('event:banned');
				}
			}
			module.parent.exports.logoutUser(theirid);
		}
	});
};

SocketAdmin.user.unbanUser = function(socket, theirid) {
	admin.user.unbanUser(socket.uid, theirid, socket);
};

SocketAdmin.user.search = function(socket, username, callback) {
	user.search(username, function(err, data) {
		function isAdmin(userData, next) {
			user.isAdministrator(userData.uid, function(err, isAdmin) {
				if(err) {
					return next(err);
				}

				userData.administrator = isAdmin?'1':'0';
				next();
			});
		}

		async.each(data.users, isAdmin, function(err) {
			callback(err, data);
		});
	});
};

/* Categories */

SocketAdmin.categories = {};

SocketAdmin.categories.create = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid data'));
	}

	categories.create(data, callback);
};

SocketAdmin.categories.update = function(socket, data) {
	if(!data) {
		return callback(new Error('invalid data'));
	}

	admin.categories.update(data, socket);
};

SocketAdmin.categories.search = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid data'));
	}

	var	username = data.username,
		cid = data.cid;

	user.search(username, function(err, data) {
		async.map(data.users, function(userObj, next) {
			CategoryTools.privileges(cid, userObj.uid, function(err, privileges) {
				if(err) {
					return next(err);
				}

				userObj.privileges = privileges;
				next(null, userObj);
			});
		}, callback);
	});
};

SocketAdmin.categories.setPrivilege = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid data'));
	}

	var	cid = data.cid,
		uid = data.uid,
		privilege = data.privilege,
		set = data.set,
		cb = function(err) {
			if(err) {
				return callback(err);
			}
			CategoryTools.privileges(cid, uid, callback);
		};

	if (set) {
		groups.joinByGroupName('cid:' + cid + ':privileges:' + privilege, uid, cb);
	} else {
		groups.leaveByGroupName('cid:' + cid + ':privileges:' + privilege, uid, cb);
	}
};

SocketAdmin.categories.getPrivilegeSettings = function(socket, cid, callback) {
	async.parallel({
		"+r": function(next) {
			groups.getByGroupName('cid:' + cid + ':privileges:+r', { expand: true }, function(err, groupObj) {
				if (!err) {
					next.apply(this, arguments);
				} else {
					next(null, {
						members: []
					});
				}
			});
		},
		"+w": function(next) {
			groups.getByGroupName('cid:' + cid + ':privileges:+w', { expand: true }, function(err, groupObj) {
				if (!err) {
					next.apply(this, arguments);
				} else {
					next(null, {
						members: []
					});
				}
			});
		}
	}, function(err, data) {
		if(err) {
			return callback(err);
		}

		callback(null, {
			"+r": data['+r'].members,
			"+w": data['+w'].members
		});
	});
};

SocketAdmin.categories.setGroupPrivilege = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid data'));
	}

	if (data.set) {
		groups.joinByGroupName('cid:' + data.cid + ':privileges:' + data.privilege, data.gid, callback);
	} else {
		groups.leaveByGroupName('cid:' + data.cid + ':privileges:' + data.privilege, data.gid, callback);
	}
};

SocketAdmin.categories.groupsList = function(socket, cid, callback) {
	groups.list({expand:false}, function(err, data){
		if(err) {
			return callback(err);
		}

		async.map(data, function(groupObj, next) {
			CategoryTools.groupPrivileges(cid, groupObj.gid, function(err, privileges) {
				if(err) {
					return next(err);
				}

				groupObj.privileges = privileges;
				next(null, groupObj);
			});
		}, callback);
	});
};

/* Themes & Plugins */

SocketAdmin.themes = {};
SocketAdmin.plugins = {};

SocketAdmin.themes.getInstalled = function(socket, data, callback) {
	meta.themes.get(callback);
};

SocketAdmin.themes.set = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid data'));
	}
	meta.themes.set(data, callback);
}

SocketAdmin.plugins.toggle = function(socket, plugin_id) {
	plugins.toggleActive(plugin_id, function(status) {
		socket.emit('admin.plugins.toggle', status);
	});
};

/* Configs */

SocketAdmin.config = {};

SocketAdmin.config.get = function(socket, data, callback) {
	meta.configs.list(callback);
};

SocketAdmin.config.set = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid data'));
	}

	meta.configs.set(data.key, data.value, function(err) {
		if(err) {
			return callback(err);
		}

		callback(null);

		plugins.fireHook('action:config.set', {
			key: data.key,
			value: data.value
		});

		logger.monitorConfig({io: index.server}, data);
	});
};

SocketAdmin.config.remove = function(socket, key) {
	meta.configs.remove(key);
};

/* Groups */

SocketAdmin.groups = {};

SocketAdmin.groups.create = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid data'));
	}

	groups.create(data.name, data.description, function(err, groupObj) {
		callback(err, groupObj || undefined);
	});
};

SocketAdmin.groups.delete = function(socket, gid, callback) {
	groups.destroy(gid, callback);
};

SocketAdmin.groups.get = function(socket, gid, callback) {
	groups.get(gid, {
		expand: true
	}, function(err, groupObj) {
		callback(err, groupObj || undefined);
	});
};

SocketAdmin.groups.join = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid data'));
	}

	groups.join(data.gid, data.uid, callback);
};

SocketAdmin.groups.leave = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid data'));
	}

	groups.leave(data.gid, data.uid, callback);
};

SocketAdmin.groups.update = function(socket, data, callback) {
	if(!data) {
		return callback(new Error('invalid data'));
	}

	groups.update(data.gid, data.values, function(err) {
		callback(err ? err.message : null);
	});
};

module.exports = SocketAdmin;