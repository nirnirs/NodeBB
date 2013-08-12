var RDB = require('./redis.js'),
	async = require('async');



function upgradeCategory(cid, callback) {
	RDB.type('categories:'+ cid +':tid', function(err, type) {
		if (type === 'set') {
			RDB.smembers('categories:' + cid + ':tid', function(err, tids) {
				
				function moveTopic(tid, callback) {
					RDB.hget('topic:' + tid, 'timestamp', function(err, timestamp) {
						if(err)
							return callback(err);

						RDB.zadd('temp_categories:'+ cid + ':tid', timestamp, tid);
						callback(null);
					});
				}
			
				async.each(tids, moveTopic, function(err) {
					if(!err) {
						console.log('renaming ' + cid);
						RDB.rename('temp_categories:' + cid + ':tid', 'categories:' + cid + ':tid');
						callback(null);
					}
					else 
						callback(err);
				});
				
			});
		} else {
			console.log('category already upgraded '+ cid);
			callback(null);
		}
	});
}

function upgradeUser(uid, callback) {
	RDB.hmgetObject('user:' + uid, ['joindate', 'postcount', 'reputation'], function(err, userData) {
		if(err)
			return callback(err);
		
		RDB.zadd('users:joindate', userData.joindate, uid);
		RDB.zadd('users:postcount', userData.postcount, uid);
		RDB.zadd('users:reputation', userData.reputation, uid);
			
		callback(null);	
	});
	
}

exports.upgrade = function() {
	
	console.log('upgrading nodebb now');

	var schema = [
		function upgradeCategories(next) {
			console.log('upgrading categories');
			
			RDB.lrange('categories:cid', 0, -1, function(err, cids) {
				
				async.each(cids, upgradeCategory, function(err) {
					if(!err)
						next(null, 'upgraded categories');
					else
						next(err, null);
				});
			});
		},
		
		function upgradeUsers(next) {
			console.log('upgrading users');
			
			RDB.lrange('userlist', 0, -1, function(err, uids) {
					
				async.each(uids, upgradeUser, function(err) {
					if(!err)
						next(null, 'upgraded users');
					else
						next(err, null);
				});	
				
			});
		}
	];
	
	async.series(schema, function(err, results) {
		if(!err)
			console.log('upgrade complete');
		else 
			console.log(err);
			
		process.exit();
	
	});
}