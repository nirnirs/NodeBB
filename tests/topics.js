var winston = require('winston');

process.on('uncaughtException', function (err) {
	winston.error('Encountered error while running test suite: ' + err.message);
});

var	assert = require('assert'),
	RDB = require('../mocks/redismock');

// Reds is not technically used in this test suite, but its invocation is required to stop the included
// libraries from trying to connect to the default Redis host/port
var reds = require('reds');
reds.createClient = function () {
	return reds.client || (reds.client = RDB);
};

var Topics = require('../src/topics');

describe('Topic\'s', function() {
	var topic;

	beforeEach(function(){
		topic = {
			userId: 1,
			categoryId: 1,
			title: 'Test Topic Title',
			content: 'The content of test topic'
		};
	});

	describe('.post', function() {

		it('should create a new topic with proper parameters', function(done) {
			Topics.post(topic.userId, topic.title, topic.content, topic.categoryId, function(err, result) {
				assert.equal(err, null, 'was created with error');
				assert.ok(result);

				done();
			});
		});

		it('should fail to create new topic with wrong parameters', function(done) {
			topic.userId = null;

			Topics.post(topic.userId, topic.title, topic.content, topic.categoryId, function(err, result) {
				assert.equal(err.message, 'not-logged-in');
				done();
			});
		});
	});

	describe('Get methods', function() {
		var	newTopic;
		var newPost;

		beforeEach(function(done){
			Topics.post(topic.userId, topic.title, topic.content, topic.categoryId, function(err, result) {
				newTopic = result.topicData;
				newPost = result.postData;
				done();
			});
		});

		describe('.getTopicData', function() {
			it('should not receive errors', function(done) {
				Topics.getTopicData(newTopic.tid, done);
			});
		});

		describe('.getTopicDataWithUser', function() {
			it('should not receive errors', function(done) {
				Topics.getTopicDataWithUser(newTopic.tid, done);
			});
		});
	});

	after(function() {
		RDB.send_command('flushdb', [], function(error){
			if(error){
				winston.error(error);
				throw new Error(error);
			}
		});
	});
});