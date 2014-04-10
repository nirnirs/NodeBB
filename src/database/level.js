'use strict';

(function(module) {
	/*
	* Okay, so LevelDB was made by Google. Therefore its skalable.
	* BUT, I created 99% of the rest of NodeBB's expected functionality out of just simple get and set commands.
	* Therefore, it is unskalable.
	*
	* With much <3, psychobunny.
	*/

	var winston = require('winston'),
		nconf = require('nconf'),
		path = require('path'),
		async = require('async'),
		express = require('express'),
		utils = require('./../../public/src/utils.js'),
		levelup,
		leveldown,
		connectLevel,
		db, ld;

	try {
		levelup = require('levelup');
		leveldown = require('leveldown');
		connectLevel = require('connect-leveldb')(express);
	} catch (err) {
		winston.error('Unable to initialize Level DB! Is Level DB installed? Error :' + err.message);
		process.exit();
	}

	module.init = function(callback) {
		db = levelup(nconf.get('level:database'));
		ld = leveldown(nconf.get('level:database'));

		db.on('error', function (err) {
			winston.error(err.message);
			process.exit();
		});

		module.client = db;

		module.sessionStore = new connectLevel({
			db: db,
			ttl: 60 * 60 * 24 * 14
		});

		if(typeof callback === 'function') {
			callback();
		}
	};

	module.close = function() {
		db.quit();
	};

	//
	// Exported functions
	//
	module.searchIndex = function(key, content, id) {
		
	};

	module.search = function(key, term, limit, callback) {
		
	};

	module.searchRemove = function(key, id, callback) {
		
	};

	module.flushdb = function(callback) {
		db.close(function() {
			leveldown.destroy(nconf.get('level:database'), function() {
				db.open(callback);
			});	
		});
	};

	module.info = function(callback) {
		
	};

	// key

	module.exists = function(key, callback) {
		db.get(key, function(err, value) {
			callback(null, !!value);
		});
	};

	module.delete = function(key, callback) {
		db.del(key, callback);
	};

	module.get = function(key, callback) {
		db.get(key, function(err, value) {
			callback(false, value);
		});
	};

	module.set = function(key, value, callback) {
		db.put(key, value, callback);
	};

	module.rename = function(oldKey, newKey, callback) {
		//db.rename(oldKey, newKey, callback);
	};

	module.expire = function(key, seconds, callback) {
		//db.expire(key, seconds, callback);
	};

	module.expireAt = function(key, timestamp, callback) {
		//db.expireat(key, timestamp, callback);
	};

	//hashes

	module.setObject = function(key, obj, callback) {
		async.parallel([
			function(next) {
				async.each(obj, function(objKey, next) {
					module.setObjectField(key, objKey, obj[objKey], next);
				}, next);
			},
			function(next) {
				module.set('leveldb:object:' + key, Object.keys(obj).join('-ldb-'));
				next();
			}
		], callback);
	};

	module.setObjectField = function(key, field, value, callback) {
		module.set(key + ':' + field, value, callback);
	};

	module.getObject = function(key, callback) {
		var obj = {};

		module.get('leveldb:object:' + key, function(err, keys) {
			if (keys) {
				keys = keys.split('-ldb-');
				async.each(keys, function(key, next) {
					module.get(key, function(err, value) {
						obj[key] = value;
						next(err);
					});
				}, function(err) {
					callback(err, obj);
				});	
			} else {
				callback(err, {});
			}
		});
	};

	module.getObjects = function(keys, callback) {
		var objs = {};

		async.each(keys, function(key, next) {
			module.getObject(key, function(err, val) {
				objs[key] = val;
				next();
			});
		}, function(err) {
			callback(err, objs);
		});
	};

	module.getObjectField = function(key, field, callback) {
		module.get(key + ':' + field, callback);
	};

	module.getObjectFields = function(key, fields, callback) {
		// can be improved with multi.
		var obj = {};
		async.each(fields, function(field, next) {
			module.getObjectField(key, field, function(err, value) {
				obj[field] = value;
				next();
			});
		}, function(err) {
			callback(err, obj);
		});
	};

	module.getObjectsFields = function(keys, fields, callback) {
		var objs = {};

		async.each(keys, function(key, next) {
			module.getObjectFields(key, fields, function(err, obj) {
				objs[key] = obj;
				next();
			});
		}, function(err) {
			callback(err, objs);
		});
	};

	module.getObjectKeys = function(key, callback) {
		module.get('leveldb:object:' + key, callback);
	};

	module.getObjectValues = function(key, callback) {
		module.getObject(key, function(err, obj) {
			var values = [];
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					values.push(obj[key]);
				}
			}

			callback(err, values);
		});
	};

	module.isObjectField = function(key, field, callback) {
		module.get(key + ':' + field, function(err, val) {
			callback(err, !!val);
		});
	};

	module.deleteObjectField = function(key, field, callback) {
		module.delete(key + ':' + field, callback);
	};

	module.incrObjectField = function(key, field, callback) {
		module.get(key + ':' + field, function(err, val) {
			module.set(key + ':' + field, val + 1, callback);
		});
	};

	module.decrObjectField = function(key, field, callback) {
		module.get(key + ':' + field, function(err, val) {
			module.set(key + ':' + field, val - 1, callback);
		});
	};

	module.incrObjectFieldBy = function(key, field, value, callback) {
		module.get(key + ':' + field, function(err, val) {
			module.set(key + ':' + field, val + value, callback);
		});
	};

	module.decrObjectFieldBy = function(key, field, value, callback) {
		module.get(key + ':' + field, function(err, val) {
			module.set(key + ':' + field, val - value, callback);
		});
	};


	// sets

	module.setAdd = function(key, value, callback) {
		db.sadd(key, value, callback);
	};

	module.setRemove = function(key, value, callback) {
		db.srem(key, value, callback);
	};

	module.isSetMember = function(key, value, callback) {
		db.sismember(key, value, function(err, result) {
			if(err) {
				return callback(err);
			}

			callback(null, result === 1);
		});
	};

	module.isSetMembers = function(key, values, callback) {
		var multi = db.multi();
		for (var i=0; i<values.length; ++i) {
			multi.sismember(key, values[i]);
		}

		multi.exec(function(err, results) {
			if (err) {
				return callback(err);
			}

			for (var i=0; i<results.length; ++i) {
				results[i] = results[i] === 1;
			}
			callback(null, results);
		});
	};

	module.isMemberOfSets = function(sets, value, callback) {
		var multi = db.multi();

		for (var i = 0, ii = sets.length; i < ii; i++) {
			multi.sismember(sets[i], value);
		}

		multi.exec(callback);
	};

	module.getSetMembers = function(key, callback) {
		db.smembers(key, callback);
	};

	module.setCount = function(key, callback) {
		db.scard(key, callback);
	};

	module.setRemoveRandom = function(key, callback) {
		db.spop(key, callback);
	};

	// sorted sets

	module.sortedSetAdd = function(key, score, value, callback) {
		db.zadd(key, score, value, callback);
	};

	module.sortedSetRemove = function(key, value, callback) {
		db.zrem(key, value, callback);
	};

	module.getSortedSetRange = function(key, start, stop, callback) {
		db.zrange(key, start, stop, callback);
	};

	module.getSortedSetRevRange = function(key, start, stop, callback) {
		db.zrevrange(key, start, stop, callback);
	};

	module.getSortedSetRangeByScore = function(args, callback) {
		db.zrangebyscore(args, callback);
	};

	module.getSortedSetRevRangeByScore = function(args, callback) {
		db.zrevrangebyscore(args, callback);
	};

	module.sortedSetCount = function(key, min, max, callback) {
		db.zcount(key, min, max, callback);
	};

	module.sortedSetCard = function(key, callback) {
		db.zcard(key, callback);
	};

	module.sortedSetRank = function(key, value, callback) {
		db.zrank(key, value, callback);
	};

	module.sortedSetRevRank = function(key, value, callback) {
		db.zrevrank(key, value, callback);
	};

	module.sortedSetScore = function(key, value, callback) {
		db.zscore(key, value, callback);
	};

	module.isSortedSetMember = function(key, value, callback) {
		module.sortedSetScore(key, value, function(err, score) {
			callback(err, !!score);
		});
	};

	module.sortedSetsScore = function(keys, value, callback) {
		var	multi = db.multi();

		for(var x=0; x<keys.length; ++x) {
			multi.zscore(keys[x], value);
		}

		multi.exec(callback);
	};

	// lists
	module.listPrepend = function(key, value, callback) {
		module.get(key, function(err, list) {
			list.split('-ldb-')
		})
		db.lpush(key, value, callback);
	};

	module.listAppend = function(key, value, callback) {
		db.rpush(key, value, callback);
	};

	module.listRemoveLast = function(key, callback) {
		db.rpop(key, callback);
	};

	module.listRemoveAll = function(key, value, callback) {
		db.lrem(key, 0, value, callback);
	};

	module.getListRange = function(key, start, stop, callback) {
		db.lrange(key, start, stop, callback);
	};

}(exports));

