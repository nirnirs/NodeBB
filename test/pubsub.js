'use strict';

var assert = require('assert');
var nconf = require('nconf');

var db = require('./mocks/databasemock');
var pubsub = require('../src/pubsub');

describe('pubsub', function () {
	it('should use the plain event emitter', function (done) {
		nconf.set('isCluster', 'false');
		pubsub.reset();
		pubsub.on('testEvent', function (message) {
			assert.equal(message.foo, 1);
			nconf.set('isCluster', 'true');
			pubsub.removeAllListeners('testEvent');
			pubsub.reset();
			done();
		});
		pubsub.publish('testEvent', { foo: 1 });
	});

	it('should use singleHostCluster', function (done) {
		var oldValue = nconf.get('singleHostCluster');
		nconf.set('singleHostCluster', true);
		pubsub.on('testEvent', function (message) {
			assert.equal(message.foo, 2);
			nconf.set('singleHostCluster', oldValue);
			pubsub.removeAllListeners('testEvent');
			pubsub.reset();
			done();
		});
		pubsub.publish('testEvent', { foo: 2 });
	});
});
