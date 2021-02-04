'use strict';

var async = require('async');
var assert = require('assert');

var db = require('./mocks/databasemock');
var groups = require('../src/groups');
var user = require('../src/user');
var blacklist = require('../src/meta/blacklist');

describe('blacklist', () => {
	var adminUid;

	before((done) => {
		user.create({ username: 'admin' }, (err, uid) => {
			assert.ifError(err);
			adminUid = uid;
			groups.join('administrators', adminUid, done);
		});
	});

	var socketBlacklist = require('../src/socket.io/blacklist');
	var rules = '1.1.1.1\n2.2.2.2\n::ffff:0:2.2.2.2\n127.0.0.1\n192.168.100.0/22';

	it('should validate blacklist', (done) => {
		socketBlacklist.validate({ uid: adminUid }, {
			rules: rules,
		}, (err, data) => {
			assert.ifError(err);
			done();
		});
	});

	it('should error if not admin', (done) => {
		socketBlacklist.save({ uid: 0 }, rules, (err) => {
			assert.equal(err.message, '[[error:no-privileges]]');
			done();
		});
	});

	it('should save blacklist', (done) => {
		socketBlacklist.save({ uid: adminUid }, rules, (err) => {
			assert.ifError(err);
			done();
		});
	});

	it('should pass ip test against blacklist', (done) => {
		blacklist.test('3.3.3.3', (err) => {
			assert.ifError(err);
			done();
		});
	});

	it('should fail ip test against blacklist', (done) => {
		blacklist.test('1.1.1.1', (err) => {
			assert.equal(err.message, '[[error:blacklisted-ip]]');
			done();
		});
	});

	it('should pass ip test and not crash with ipv6 address', (done) => {
		blacklist.test('2001:db8:85a3:0:0:8a2e:370:7334', (err) => {
			assert.ifError(err);
			done();
		});
	});
});
