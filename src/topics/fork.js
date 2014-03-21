
'use strict';

var async = require('async'),
	winston = require('winston'),

	db = require('./../database'),

	posts = require('./../posts'),
	postTools = require('./../postTools'),
	threadTools = require('./../threadTools');


module.exports = function(Topics) {

	Topics.createTopicFromPosts = function(uid, title, pids, callback) {
		if(title) {
			title = title.trim();
		}

		if(!title) {
			return callback(new Error('invalid-title'));
		}

		if(!pids || !pids.length) {
			return callback(new Error('invalid-pids'));
		}

		pids.sort();
		var mainPid = pids[0];

		async.parallel({
			postData: function(callback) {
				posts.getPostData(mainPid, callback);
			},
			cid: function(callback) {
				posts.getCidByPid(mainPid, callback);
			}
		}, function(err, results) {
			Topics.create({uid: results.postData.uid, title: title, cid: results.cid}, function(err, tid) {
				if(err) {
					return callback(err);
				}

				async.eachSeries(pids, move, function(err) {
					if(err) {
						return callback(err);
					}

					Topics.getTopicData(tid, callback);
				});

				function move(pid, next) {
					postTools.privileges(pid, uid, function(err, privileges) {
						if(err) {
							return next(err);
						}

						if(privileges.editable) {
							Topics.movePostToTopic(pid, tid, next);
						} else {
							next();
						}
					});
				}
			});
		});
	};

	Topics.movePostToTopic = function(pid, tid, callback) {
		threadTools.exists(tid, function(err, exists) {
			if(err || !exists) {
				return callback(err || new Error('Topic doesn\'t exist'));
			}

			posts.getPostFields(pid, ['deleted', 'tid', 'timestamp'], function(err, postData) {
				if(err) {
					return callback(err);
				}

				if(!postData) {
					return callback(new Error('Post doesn\'t exist'));
				}

				Topics.removePostFromTopic(postData.tid, pid, function(err) {
					if(err) {
						return callback(err);
					}

					if(!parseInt(postData.deleted, 10)) {
						Topics.decreasePostCount(postData.tid);
						Topics.increasePostCount(tid);
					}

					posts.setPostField(pid, 'tid', tid);
					Topics.addPostToTopic(tid, pid, postData.timestamp, callback);
				});
			});
		});
	};
};