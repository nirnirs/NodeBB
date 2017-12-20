
'use strict';

var async = require('async');
var _ = require('lodash');

var groups = require('../groups');
var user = require('../user');
var plugins = require('../plugins');

var helpers = module.exports;

helpers.some = function (tasks, callback) {
	async.some(tasks, function (task, next) {
		task(next);
	}, callback);
};

helpers.isUserAllowedTo = function (privilege, uid, cid, callback) {
	if (Array.isArray(privilege) && !Array.isArray(cid)) {
		isUserAllowedToPrivileges(privilege, uid, cid, callback);
	} else if (Array.isArray(cid) && !Array.isArray(privilege)) {
		isUserAllowedToCids(privilege, uid, cid, callback);
	} else {
		return callback(new Error('[[error:invalid-data]]'));
	}
};

function isUserAllowedToCids(privilege, uid, cids, callback) {
	if (parseInt(uid, 10) === 0) {
		return isGuestAllowedToCids(privilege, cids, callback);
	}

	var userKeys = [];
	var groupKeys = [];
	cids.forEach(function (cid) {
		userKeys.push('cid:' + cid + ':privileges:' + privilege);
		groupKeys.push('cid:' + cid + ':privileges:groups:' + privilege);
	});

	checkIfAllowed(uid, userKeys, groupKeys, callback);
}

function isUserAllowedToPrivileges(privileges, uid, cid, callback) {
	if (parseInt(uid, 10) === 0) {
		return isGuestAllowedToPrivileges(privileges, cid, callback);
	}

	var userKeys = [];
	var groupKeys = [];
	privileges.forEach(function (privilege) {
		userKeys.push('cid:' + cid + ':privileges:' + privilege);
		groupKeys.push('cid:' + cid + ':privileges:groups:' + privilege);
	});

	checkIfAllowed(uid, userKeys, groupKeys, callback);
}

function checkIfAllowed(uid, userKeys, groupKeys, callback) {
	async.waterfall([
		function (next) {
			async.parallel({
				hasUserPrivilege: function (next) {
					groups.isMemberOfGroups(uid, userKeys, next);
				},
				hasGroupPrivilege: function (next) {
					groups.isMemberOfGroupsList(uid, groupKeys, next);
				},
			}, next);
		},
		function (results, next) {
			var result = userKeys.map(function (key, index) {
				return results.hasUserPrivilege[index] || results.hasGroupPrivilege[index];
			});

			next(null, result);
		},
	], callback);
}

helpers.isUsersAllowedTo = function (privilege, uids, cid, callback) {
	async.waterfall([
		function (next) {
			async.parallel({
				hasUserPrivilege: function (next) {
					groups.isMembers(uids, 'cid:' + cid + ':privileges:' + privilege, next);
				},
				hasGroupPrivilege: function (next) {
					groups.isMembersOfGroupList(uids, 'cid:' + cid + ':privileges:groups:' + privilege, next);
				},
			}, next);
		},
		function (results, next) {
			var result = uids.map(function (uid, index) {
				return results.hasUserPrivilege[index] || results.hasGroupPrivilege[index];
			});

			next(null, result);
		},
	], callback);
};

function isGuestAllowedToCids(privilege, cids, callback) {
	var groupKeys = cids.map(function (cid) {
		return 'cid:' + cid + ':privileges:groups:' + privilege;
	});

	groups.isMemberOfGroups('guests', groupKeys, callback);
}

function isGuestAllowedToPrivileges(privileges, cid, callback) {
	var groupKeys = privileges.map(function (privilege) {
		return 'cid:' + cid + ':privileges:groups:' + privilege;
	});

	groups.isMemberOfGroups('guests', groupKeys, callback);
}

helpers.getUserPrivileges = function (cid, hookName, userPrivilegeList, callback) {
	var userPrivileges;
	var memberSets;
	async.waterfall([
		async.apply(plugins.fireHook, hookName, userPrivilegeList.slice()),
		function (_privs, next) {
			userPrivileges = _privs;
			groups.getMembersOfGroups(userPrivileges.map(function (privilege) {
				return 'cid:' + cid + ':privileges:' + privilege;
			}), next);
		},
		function (_memberSets, next) {
			memberSets = _memberSets.map(function (set) {
				return set.map(function (uid) {
					return parseInt(uid, 10);
				});
			});

			var members = _.uniq(_.flatten(memberSets));

			user.getUsersFields(members, ['picture', 'username'], next);
		},
		function (memberData, next) {
			memberData.forEach(function (member) {
				member.privileges = {};
				for (var x = 0, numPrivs = userPrivileges.length; x < numPrivs; x += 1) {
					member.privileges[userPrivileges[x]] = memberSets[x].indexOf(parseInt(member.uid, 10)) !== -1;
				}
			});

			next(null, memberData);
		},
	], callback);
};

helpers.getGroupPrivileges = function (cid, hookName, groupPrivilegeList, callback) {
	var groupPrivileges;
	async.waterfall([
		async.apply(plugins.fireHook, hookName, groupPrivilegeList.slice()),
		function (_privs, next) {
			groupPrivileges = _privs;
			async.parallel({
				memberSets: function (next) {
					groups.getMembersOfGroups(groupPrivileges.map(function (privilege) {
						return 'cid:' + cid + ':privileges:' + privilege;
					}), next);
				},
				groupNames: function (next) {
					groups.getGroups('groups:createtime', 0, -1, next);
				},
			}, next);
		},
		function (results, next) {
			var memberSets = results.memberSets;
			var uniqueGroups = _.uniq(_.flatten(memberSets));

			var groupNames = results.groupNames.filter(function (groupName) {
				return groupName.indexOf(':privileges:') === -1 && uniqueGroups.indexOf(groupName) !== -1;
			});

			groupNames = groups.ephemeralGroups.concat(groupNames);
			var registeredUsersIndex = groupNames.indexOf('registered-users');
			if (registeredUsersIndex !== -1) {
				groupNames.splice(0, 0, groupNames.splice(registeredUsersIndex, 1)[0]);
			} else {
				groupNames = ['registered-users'].concat(groupNames);
			}

			var adminIndex = groupNames.indexOf('administrators');
			if (adminIndex !== -1) {
				groupNames.splice(adminIndex, 1);
			}

			var memberPrivs;

			var memberData = groupNames.map(function (member) {
				memberPrivs = {};

				for (var x = 0, numPrivs = groupPrivileges.length; x < numPrivs; x += 1) {
					memberPrivs[groupPrivileges[x]] = memberSets[x].indexOf(member) !== -1;
				}
				return {
					name: member,
					privileges: memberPrivs,
				};
			});

			next(null, memberData);
		},
		function (memberData, next) {
			// Grab privacy info for the groups as well
			async.map(memberData, function (member, next) {
				async.waterfall([
					function (next) {
						groups.isPrivate(member.name, next);
					},
					function (isPrivate, next) {
						member.isPrivate = isPrivate;
						next(null, member);
					},
				], next);
			}, next);
		},
	], callback);
};