'use strict';

const user = require('../user');
const groups = require('../groups');
const meta = require('../meta');
const flags = require('../flags');
const privileges = require('../privileges');
const notifications = require('../notifications');
const plugins = require('../plugins');
const events = require('../events');

const usersAPI = module.exports;

usersAPI.create = async function (caller, data) {
	if (!data) {
		throw new Error('[[error:invalid-data]]');
	}
	const uid = await user.create(data);
	return await user.getUserData(uid);
};

usersAPI.update = async function (caller, data) {
	const oldUserData = await user.getUserFields(data.uid, ['email', 'username']);
	if (!oldUserData || !oldUserData.username) {
		throw new Error('[[error:invalid-data]]');
	}

	const [isAdminOrGlobalMod, canEdit, passwordMatch] = await Promise.all([
		user.isAdminOrGlobalMod(caller.uid),
		privileges.users.canEdit(caller.uid, data.uid),
		data.password ? user.isPasswordCorrect(data.uid, data.password, caller.ip) : false,
	]);

	// Changing own email/username requires password confirmation
	if (['email', 'username'].some(prop => Object.keys(data).includes(prop)) && !isAdminOrGlobalMod && caller.uid === data.uid && !passwordMatch) {
		throw new Error('[[error:invalid-password]]');
	}

	if (!canEdit) {
		throw new Error('[[error:no-privileges]]');
	}

	if (!isAdminOrGlobalMod && meta.config['username:disableEdit']) {
		data.username = oldUserData.username;
	}

	if (!isAdminOrGlobalMod && meta.config['email:disableEdit']) {
		data.email = oldUserData.email;
	}

	await user.updateProfile(caller.uid, data);
	const userData = await user.getUserData(data.uid);

	async function log(type, eventData) {
		eventData.type = type;
		eventData.uid = caller.uid;
		eventData.targetUid = data.uid;
		eventData.ip = caller.ip;
		await events.log(eventData);
	}

	if (userData.email !== oldUserData.email) {
		await log('email-change', { oldEmail: oldUserData.email, newEmail: userData.email });
	}

	if (userData.username !== oldUserData.username) {
		await log('username-change', { oldUsername: oldUserData.username, newUsername: userData.username });
	}
};

usersAPI.delete = async function (caller, data) {
	processDeletion(data.uid, caller);
};

usersAPI.deleteMany = async function (caller, data) {
	console.log(data.uids);
	if (await canDeleteUids(data.uids)) {
		await Promise.all(data.uids.map(uid => processDeletion(uid, caller)));
	}
};

usersAPI.changePassword = async function (caller, data) {
	await user.changePassword(caller.uid, Object.assign(data, { ip: caller.ip }));
	await events.log({
		type: 'password-change',
		uid: caller.uid,
		targetUid: data.uid,
		ip: caller.ip,
	});
};

usersAPI.follow = async function (caller, data) {
	await user.follow(caller.uid, data.uid);
	plugins.fireHook('action:user.follow', {
		fromUid: caller.uid,
		toUid: data.uid,
	});

	const userData = await user.getUserFields(caller.uid, ['username', 'userslug']);
	const notifObj = await notifications.create({
		type: 'follow',
		bodyShort: '[[notifications:user_started_following_you, ' + userData.username + ']]',
		nid: 'follow:' + data.uid + ':uid:' + caller.uid,
		from: caller.uid,
		path: '/uid/' + data.uid + '/followers',
		mergeId: 'notifications:user_started_following_you',
	});
	if (!notifObj) {
		return;
	}
	notifObj.user = userData;
	await notifications.push(notifObj, [data.uid]);
};

usersAPI.unfollow = async function (caller, data) {
	await user.unfollow(caller.uid, data.uid);
	plugins.fireHook('action:user.unfollow', {
		fromUid: caller.uid,
		toUid: data.uid,
	});
};

async function processDeletion(uid, caller) {
	const isTargetAdmin = await user.isAdministrator(uid);
	const isSelf = parseInt(uid, 10) === caller.uid;
	const isAdmin = await user.isAdministrator(caller.uid);

	if (!isSelf && !isAdmin) {
		throw new Error('[[error:no-privileges]]');
	} else if (!isSelf && isTargetAdmin) {
		throw new Error('[[error:cant-delete-other-admins]]');
	}

	// TODO: clear user tokens for this uid
	await flags.resolveFlag('user', uid, caller.uid);
	const userData = await user.delete(caller.uid, uid);
	await events.log({
		type: 'user-delete',
		uid: caller.uid,
		targetUid: uid,
		ip: caller.ip,
		username: userData.username,
		email: userData.email,
	});
}

async function canDeleteUids(uids) {
	if (!Array.isArray(uids)) {
		throw new Error('[[error:invalid-data]]');
	}
	const isMembers = await groups.isMembers(uids, 'administrators');
	if (isMembers.includes(true)) {
		throw new Error('[[error:cant-delete-other-admins]]');
	}

	return true;
}
