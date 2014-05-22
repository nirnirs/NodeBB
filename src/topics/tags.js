
'use strict';

var async = require('async'),
	db = require('../database'),
	utils = require('../../public/src/utils');

module.exports = function(Topics) {

	Topics.createTags = function(tags, tid, timestamp) {
		if(Array.isArray(tags)) {
			for (var i=0; i<tags.length; ++i) {
				tags[i] = utils.removePunctuation(tags[i].trim().toLowerCase()).substr(0, 20); // TODO: make max length configurable

				db.sortedSetAdd('tag:' + tags[i] + ':topics', timestamp, tid);
				db.setAdd('topic:' + tid + ':tags', tags[i]);
				db.setAdd('tags', tags[i]);
			}
		}
	};

	Topics.getTagTids = function(tag, start, end, callback) {
		db.getSortedSetRevRange('tag:' + tag + ':topics', start, end, callback);
	};

	Topics.getTagTopicCount = function(tag, callback) {
		db.sortedSetCard('tag:' + tag + ':topics', callback);
	};

	Topics.getTags = function(callback) {
		db.getSetMembers('tags', callback);
	};

	//returns tags as objects cuz templates.js cant do arrays yet >_>
	Topics.getTagsObjects = function(callback) {
		Topics.getTags(function(err, tags) {
			callback(err, mapToObject(tags));
		});
	};

	Topics.getTopicTags = function(tid, callback) {
		db.getSetMembers('topic:' + tid + ':tags', callback);
	};

	//returns tags as objects cuz templates.js cant do arrays yet >_>
	Topics.getTopicTagsObjects = function(tid, callback) {
		Topics.getTopicTags(tid, function(err, tags) {
			callback(err, mapToObject(tags));
		});
	};

	function mapToObject(tags) {
		if (!tags) {
			return tags;
		}
		return tags.map(function(tag) {
			return {name: tag};
		});
	}

	Topics.updateTags = function(tid, tags) {
		Topics.getTopicField(tid, 'timestamp', function(err, timestamp) {
			if (!err) {
				Topics.deleteTopicTags(tid, function(err) {
					if (!err) {
						Topics.createTags(tags, tid, timestamp);
					}
				});
			}
		});
	};

	Topics.deleteTopicTags = function(tid, callback) {
		Topics.getTopicTags(tid, function(err, tags) {
			if (err) {
				return callback(err);
			}

			async.parallel([
				function(next) {
					db.delete('topic:' + tid + ':tags', next);
				},
				function(next) {
					async.each(tags, function(tag, next) {
						db.sortedSetRemove('tag:' + tag + ':topics', tid, next);
					}, next);
				}
			], callback);
		});
	};

	Topics.searchTags = function(query, callback) {
		if (!query || query.length === 0) {
			return callback(null, []);
		}

		db.getSetMembers('tags', function(err, tags) {
			if (err) {
				return callback(null, []);
			}

			query = query.toLowerCase();
			var matches = [];
			for(var i=0; i<tags.length; ++i) {
				if (tags[i].toLowerCase().indexOf(query) === 0) {
					matches.push(tags[i]);
				}
			}

			matches = matches.slice(0, 10).sort(function(a, b) {
				return a > b;
			});

			callback(null, matches);
		});
	};

};