var	assert = require('assert'),
	async = require('async'),

	db = require('../mocks/databasemock'),
	Groups = require('../src/groups'),
	User = require('../src/user');

describe('Groups Library', function() {
	before(function(done) {
		async.parallel([
			function(next) {
				// Create a group to play around with
				Groups.create('Test', 'Foobar!', next);
			},
			function(next) {
				// Create a new user
				User.create({
					username: 'testuser',
					email: 'b@c.com'
				}, done);
			},
			function(next) {
				// Also create a hidden group
				Groups.join('Hidden', 'Test', next);
			}
		], done);
	});

	describe('.list()', function() {
		it('should list the groups present', function(done) {
			Groups.list({}, function(err, groups) {
				if (err) return done(err);

				assert.equal(groups.length, 1);
				done();
			});
		});
	});

	describe('.get()', function() {
		before(function(done) {
			Groups.join('Test', 1, done);
		});

		it('with no options, should show group information', function(done) {
			Groups.get('Test', {}, function(err, groupObj) {
				if (err) return done(err);

				assert.equal(typeof groupObj, 'object');
				assert(Array.isArray(groupObj.members));
				assert.strictEqual(groupObj.name, 'Test');
				assert.strictEqual(groupObj.description, 'Foobar!');
				assert.strictEqual(groupObj.memberCount, 1);
				assert.notEqual(typeof groupObj.members[0], 'object');

				done();
			});
		});

		it('with the "expand" option, should show both group information and user information', function(done) {
			Groups.get('Test', { expand: true }, function(err, groupObj) {
				if (err) return done(err);

				assert.equal(typeof groupObj, 'object');
				assert(Array.isArray(groupObj.members));
				assert.strictEqual(groupObj.name, 'Test');
				assert.strictEqual(groupObj.description, 'Foobar!');
				assert.strictEqual(groupObj.memberCount, 1);
				assert.equal(typeof groupObj.members[0], 'object');

				done();
			});
		});
	});

	describe('.isMember()', function() {
		it('should return boolean true when a user is in a group', function(done) {
			Groups.isMember(1, 'Test', function(err, isMember) {
				if (err) return done(err);

				assert.strictEqual(isMember, true);

				done();
			});
		});

		it('should return boolean false when a user is not in a group', function(done) {
			Groups.isMember(2, 'Test', function(err, isMember) {
				if (err) return done(err);

				assert.strictEqual(isMember, false);

				done();
			});
		});
	});

	describe('.isMemberOfGroupList', function() {
		it('should report that a user is part of a groupList, if they are', function(done) {
			Groups.isMemberOfGroupList(1, 'Hidden', function(err, isMember) {
				if (err) return done(err);

				assert.strictEqual(isMember, true);

				done();
			});
		});

		it('should report that a user is not part of a groupList, if they are not', function(done) {
			Groups.isMemberOfGroupList(2, 'Hidden', function(err, isMember) {
				if (err) return done(err);

				assert.strictEqual(isMember, false);

				done();
			});
		});
	});

	describe('.exists()', function() {
		it('should verify that the test group exists', function(done) {
			Groups.exists('Test', function(err, exists) {
				if (err) return done(err);

				assert.strictEqual(exists, true);

				done();
			});
		});

		it('should verify that a fake group does not exist', function(done) {
			Groups.exists('Derp', function(err, exists) {
				if (err) return done(err);

				assert.strictEqual(exists, false);

				done();
			});
		});
	});

	describe('.create()', function() {
		it('should create another group', function(done) {
			Groups.create('foo', 'bar', function(err) {
				if (err) return done(err);

				Groups.get('foo', {}, done);
			});
		});
	});

	describe('.hide()', function() {
		it('should mark the group as hidden', function(done) {
			Groups.hide('foo', function(err) {
				if (err) return done(err);

				Groups.get('foo', {}, function(err, groupObj) {
					if (err) return done(err);

					assert.strictEqual(true, groupObj.hidden);

					done();
				});
			});
		});
	});

	describe('.update()', function() {
		it('should change an aspect of a group', function(done) {
			Groups.update('foo', {
				description: 'baz'
			}, function(err) {
				if (err) return done(err);

				Groups.get('foo', {}, function(err, groupObj) {
					if (err) return done(err);

					assert.strictEqual('baz', groupObj.description);

					done();
				});
			});
		});
	});

	describe('.destroy()', function() {
		it('should destroy a group', function(done) {
			Groups.destroy('foo', function(err) {
				if (err) return done(err);

				Groups.get('foo', {}, function(err, groupObj) {
					assert(err);
					assert.strictEqual(undefined, groupObj);

					done();
				});
			});
		});
	});

	describe('.join()', function() {
		before(function(done) {
			Groups.leave('Test', 1, done);
		});

		it('should add a user to a group', function(done) {
			Groups.join('Test', 1, function(err) {
				if (err) return done(err);

				Groups.isMember(1, 'Test', function(err, isMember) {
					assert.strictEqual(true, isMember);

					done();
				});
			});
		});
	});
});