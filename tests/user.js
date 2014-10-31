var winston = require('winston');

process.on('uncaughtException', function (err) {
	winston.error('Encountered error while running test suite: ' + err.message);
});

var	assert = require('assert'),
	async = require('async'),
	db = require('./mocks/databasemock');

var User = require('../src/user'),
	Topics = require('../src/topics'),
	Categories = require('../src/categories'),
	Meta = require('../src/meta');

describe('User', function() {
	var	userData,
		testUid,
		testCid;

	before(function(done) {
		Categories.create({
			name: 'Test Category',
			description: 'A test',
			order: 1
		}, function(err, categoryObj) {
			testCid = categoryObj.cid;
			done();
		});
	});

	beforeEach(function(){
		userData = {
			username: 'John Smith',
			password: 'swordfish',
			email: 'john@example.com',
			callback: undefined
		};
	});


	describe('.create(), when created', function() {
		it('should be created properly', function(done) {
			User.create({username: userData.username, password: userData.password, email: userData.email}, function(error,userId){
				assert.equal(error, null, 'was created with error');
				assert.ok(userId);

				testUid = userId;
				done();
			});
		});

		it('should have a valid email, if using an email', function() {
			assert.throws(
				User.create({username: userData.username, password: userData.password, email: 'fakeMail'},function(){}),
				Error,
				'does not validate email'
			);
		});
	});

	describe('.isReadyToPost()', function() {
		it('should error when a user makes two posts in quick succession', function(done) {
			Meta.config = Meta.config || {};
			Meta.config.postDelay = '10';

			async.series([
				async.apply(Topics.post, {
					uid: testUid,
					title: 'Topic 1',
					content: 'lorem ipsum',
					cid: testCid
				}),
				async.apply(Topics.post, {
					uid: testUid,
					title: 'Topic 2',
					content: 'lorem ipsum',
					cid: testCid
				})
			], function(err) {
				assert(err);
				done();
			});
		});

		it('should allow a post if the last post time is > 10 seconds', function(done) {
			User.setUserField(testUid, 'lastposttime', +new Date()-(11*1000), function() {
				Topics.post({
					uid: testUid,
					title: 'Topic 3',
					content: 'lorem ipsum',
					cid: testCid
				}, function(err) {
					assert.ifError(err);
					done();
				});
			});
		});

		it('should error when a new user posts if the last post time is 10 < 30 seconds', function(done) {
			Meta.config.newbiePostDelay = 30;
			Meta.config.newbiePostDelayThreshold = 3;

			User.setUserField(testUid, 'lastposttime', +new Date()-(20*1000), function() {
				Topics.post({
					uid: testUid,
					title: 'Topic 4',
					content: 'lorem ipsum',
					cid: testCid
				}, function(err) {
					assert(err);
					done();
				});
			});
		});

		it('should not error if a non-newbie user posts if the last post time is 10 < 30 seconds', function(done) {
			User.setUserFields(testUid, {
				lastposttime:  +new Date()-(20*1000),
				reputation: 10
			}, function() {
				Topics.post({
					uid: testUid,
					title: 'Topic 5',
					content: 'lorem ipsum',
					cid: testCid
				}, function(err) {
					assert.ifError(err);
					done();
				});
			});
		});
	});

	after(function() {
		db.flushdb();
	});
});