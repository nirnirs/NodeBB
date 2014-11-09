'use strict';

var async = require('async'),
	db = require('../database'),
	privileges = require('../privileges');


module.exports = function(Posts) {
	var terms = {
		day: 86400000,
		week: 604800000,
		month: 2592000000
	};

	Posts.getRecentPosts = function(uid, start, stop, term, callback) {
		var since = terms.day;
		if (terms[term]) {
			since = terms[term];
		}

		var count = parseInt(stop, 10) === -1 ? stop : stop - start + 1;

		async.waterfall([
			function(next) {
				db.getSortedSetRevRangeByScore('posts:pid', start, count, '+inf', Date.now() - since, next);
			},
			function(pids, next) {
				privileges.posts.filter('read', pids, uid, next);
			},
			function(pids, next) {
				Posts.getPostSummaryByPids(pids, uid, {stripTags: true}, next);
			}
		], callback);
	};

	Posts.getRecentPosterUids = function(start, end, callback) {
		async.waterfall([
			function(next) {
				db.getSortedSetRevRange('posts:pid', start, end, next);
			},
			function(pids, next) {
				Posts.getPostsFields(pids, ['uid'], next);
			},
			function(postData, next) {
				postData = postData.map(function(post) {
					return post && post.uid;
				}).filter(function(value, index, array) {
					return value && array.indexOf(value) === index;
				});
				next(null, postData);
			}
		], callback);
 	};
};
