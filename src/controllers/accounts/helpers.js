'use strict';

const validator = require('validator');
const nconf = require('nconf');

const user = require('../../user');
const groups = require('../../groups');
const plugins = require('../../plugins');
const meta = require('../../meta');
const utils = require('../../utils');
const privileges = require('../../privileges');
const translator = require('../../translator');
const messaging = require('../../messaging');
const { buildLinks } = require('../helpers');

const helpers = module.exports;

helpers.getUserDataByUserSlug = async function (userslug, callerUID) {
	const uid = await user.getUidByUserslug(userslug);
	if (!uid) {
		return null;
	}

	const results = await getAllData(uid, callerUID);
	if (!results.userData) {
		throw new Error('[[error:invalid-uid]]');
	}
	await parseAboutMe(results.userData);

	const userData = results.userData;
	const userSettings = results.userSettings;
	const isAdmin = results.isAdmin;
	const isGlobalModerator = results.isGlobalModerator;
	const isModerator = results.isModerator;
	const canViewInfo = results.canViewInfo;
	const isSelf = parseInt(callerUID, 10) === parseInt(userData.uid, 10);

	userData.age = Math.max(0, userData.birthday ? Math.floor((new Date().getTime() - new Date(userData.birthday).getTime()) / 31536000000) : 0);

	userData.emailClass = 'hide';

	if (!isAdmin && !isGlobalModerator && !isSelf && (!userSettings.showemail || meta.config.hideEmail)) {
		userData.email = '';
	} else if (!userSettings.showemail) {
		userData.emailClass = '';
	}

	if (!isAdmin && !isGlobalModerator && !isSelf && (!userSettings.showfullname || meta.config.hideFullname)) {
		userData.fullname = '';
	}

	if (isAdmin || isSelf || (canViewInfo && !results.isTargetAdmin)) {
		userData.ips = results.ips;
	}

	if (!isAdmin && !isGlobalModerator && !isModerator) {
		userData.moderationNote = undefined;
	}

	userData.isBlocked = results.isBlocked;
	if (isAdmin || isSelf) {
		userData.blocksCount = await user.getUserField(userData.uid, 'blocksCount');
	}

	userData.yourid = callerUID;
	userData.theirid = userData.uid;
	userData.isTargetAdmin = results.isTargetAdmin;
	userData.isAdmin = isAdmin;
	userData.isGlobalModerator = isGlobalModerator;
	userData.isModerator = isModerator;
	userData.isAdminOrGlobalModerator = isAdmin || isGlobalModerator;
	userData.isAdminOrGlobalModeratorOrModerator = isAdmin || isGlobalModerator || isModerator;
	userData.isSelfOrAdminOrGlobalModerator = isSelf || isAdmin || isGlobalModerator;
	userData.canEdit = results.canEdit;
	userData.canBan = results.canBanUser;
	userData.canChangePassword = isAdmin || (isSelf && !meta.config['password:disableEdit']);
	userData.isSelf = isSelf;
	userData.isFollowing = results.isFollowing;
	userData.hasPrivateChat = results.hasPrivateChat;
	userData.showHidden = isSelf || isAdmin || (isGlobalModerator && !results.isTargetAdmin);
	userData.groups = Array.isArray(results.groups) && results.groups.length ? results.groups[0] : [];
	userData.disableSignatures = meta.config.disableSignatures === 1;
	userData['reputation:disabled'] = meta.config['reputation:disabled'] === 1;
	userData['downvote:disabled'] = meta.config['downvote:disabled'] === 1;
	userData['email:confirmed'] = !!userData['email:confirmed'];

	const profileMenuLinks = [{
		id: 'info',
		route: 'info',
		name: '[[user:account_info]]',
		icon: 'fa-info',
		visibility: {
			self: false,
			other: false,
			moderator: false,
			globalMod: false,
			admin: true,
			canViewInfo: true,
		},
	}, {
		id: 'sessions',
		route: 'sessions',
		name: '[[pages:account/sessions]]',
		icon: 'fa-group',
		visibility: {
			self: true,
			other: false,
			moderator: false,
			globalMod: false,
			admin: false,
			canViewInfo: false,
		},
	}];

	if (meta.config.gdpr_enabled) {
		profileMenuLinks.push({
			id: 'consent',
			route: 'consent',
			name: '[[user:consent.title]]',
			icon: 'fa-thumbs-o-up',
			visibility: {
				self: true,
				other: false,
				moderator: false,
				globalMod: false,
				admin: false,
				canViewInfo: false,
			},
		});
	}

	const { links } = await plugins.fireHook('filter:user.profileMenu', { uid, callerUID, links: profileMenuLinks });

	userData.profile_links = await buildLinks('accounts/profile', links, {
		self: isSelf,
		other: !isSelf,
		moderator: isModerator,
		globalMod: isGlobalModerator,
		admin: isAdmin,
		canViewInfo: canViewInfo,
	});

	userData.sso = results.sso.associations;
	userData.banned = userData.banned === 1;
	userData.website = validator.escape(String(userData.website || ''));
	userData.websiteLink = !userData.website.startsWith('http') ? 'http://' + userData.website : userData.website;
	userData.websiteName = userData.website.replace(validator.escape('http://'), '').replace(validator.escape('https://'), '');

	userData.fullname = validator.escape(String(userData.fullname || ''));
	userData.location = validator.escape(String(userData.location || ''));
	userData.signature = validator.escape(String(userData.signature || ''));
	userData.birthday = validator.escape(String(userData.birthday || ''));
	userData.moderationNote = validator.escape(String(userData.moderationNote || ''));

	if (userData['cover:url']) {
		userData['cover:url'] = userData['cover:url'].startsWith('http') ? userData['cover:url'] : (nconf.get('relative_path') + userData['cover:url']);
	} else {
		userData['cover:url'] = require('../../coverPhoto').getDefaultProfileCover(userData.uid);
	}

	userData['cover:position'] = validator.escape(String(userData['cover:position'] || '50% 50%'));
	userData['username:disableEdit'] = !userData.isAdmin && meta.config['username:disableEdit'];
	userData['email:disableEdit'] = !userData.isAdmin && meta.config['email:disableEdit'];
	const hookData = await plugins.fireHook('filter:helpers.getUserDataByUserSlug', { userData: userData, callerUID: callerUID });
	return hookData.userData;
};

async function getAllData(uid, callerUID) {
	return await utils.promiseParallel({
		userData: user.getUserData(uid),
		isTargetAdmin: user.isAdministrator(uid),
		userSettings: user.getSettings(uid),
		isAdmin: user.isAdministrator(callerUID),
		isGlobalModerator: user.isGlobalModerator(callerUID),
		isModerator: user.isModeratorOfAnyCategory(callerUID),
		isFollowing: user.isFollowing(callerUID, uid),
		ips: user.getIPs(uid, 4),
		groups: groups.getUserGroups([uid]),
		sso: plugins.fireHook('filter:auth.list', { uid: uid, associations: [] }),
		canEdit: privileges.users.canEdit(callerUID, uid),
		canBanUser: privileges.users.canBanUser(callerUID, uid),
		isBlocked: user.blocks.is(uid, callerUID),
		canViewInfo: privileges.global.can('view:users:info', callerUID),
		hasPrivateChat: messaging.hasPrivateChat(callerUID, uid),
	});
}

async function parseAboutMe(userData) {
	if (!userData.aboutme) {
		userData.aboutme = '';
		userData.aboutmeParsed = '';
		return;
	}
	userData.aboutme = validator.escape(String(userData.aboutme || ''));
	const parsed = await plugins.fireHook('filter:parse.aboutme', userData.aboutme);
	userData.aboutmeParsed = translator.escape(parsed);
}

require('../../promisify')(helpers);
