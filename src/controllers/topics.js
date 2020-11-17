'use strict';

const nconf = require('nconf');

const user = require('../user');
const meta = require('../meta');
const topics = require('../topics');
const categories = require('../categories');
const posts = require('../posts');
const privileges = require('../privileges');
const helpers = require('./helpers');
const pagination = require('../pagination');
const utils = require('../utils');
const analytics = require('../analytics');

const topicsController = module.exports;

const url = nconf.get('url');
const relative_path = nconf.get('relative_path');
const upload_url = nconf.get('upload_url');

topicsController.get = async function getTopic(req, res, callback) {
	const tid = req.params.topic_id;

	if ((req.params.post_index && !utils.isNumber(req.params.post_index) && req.params.post_index !== 'unread') || !utils.isNumber(tid)) {
		return callback();
	}
	let postIndex = parseInt(req.params.post_index, 10) || 1;
	const [
		userPrivileges,
		settings,
		topicData,
		rssToken,
	] = await Promise.all([
		privileges.topics.get(tid, req.uid),
		user.getSettings(req.uid),
		topics.getTopicData(tid),
		user.auth.getFeedToken(req.uid),
	]);

	let currentPage = parseInt(req.query.page, 10) || 1;
	const pageCount = Math.max(1, Math.ceil((topicData && topicData.postcount) / settings.postsPerPage));
	if (!topicData || userPrivileges.disabled || (settings.usePagination && (currentPage < 1 || currentPage > pageCount))) {
		return callback();
	}

	if (!userPrivileges['topics:read'] || (topicData.deleted && !userPrivileges.view_deleted)) {
		return helpers.notAllowed(req, res);
	}

	if (!res.locals.isAPI && (!req.params.slug || topicData.slug !== tid + '/' + req.params.slug) && (topicData.slug && topicData.slug !== tid + '/')) {
		return helpers.redirect(res, '/topic/' + topicData.slug + (postIndex ? '/' + postIndex : '') + (currentPage > 1 ? '?page=' + currentPage : ''), true);
	}

	if (postIndex === 'unread') {
		postIndex = await topics.getUserBookmark(tid, req.uid);
	}

	if (utils.isNumber(postIndex) && topicData.postcount > 0 && (postIndex < 1 || postIndex > topicData.postcount)) {
		return helpers.redirect(res, '/topic/' + req.params.topic_id + '/' + req.params.slug + (postIndex > topicData.postcount ? '/' + topicData.postcount : ''));
	}
	postIndex = Math.max(1, postIndex);
	const sort = req.query.sort || settings.topicPostSort;
	const set = sort === 'most_votes' ? 'tid:' + tid + ':posts:votes' : 'tid:' + tid + ':posts';
	const reverse = sort === 'newest_to_oldest' || sort === 'most_votes';
	if (settings.usePagination && !req.query.page) {
		currentPage = calculatePageFromIndex(postIndex, settings);
	}
	const { start, stop } = calculateStartStop(currentPage, postIndex, settings);

	await topics.getTopicWithPosts(topicData, set, req.uid, start, stop, reverse);

	topics.modifyPostsByPrivilege(topicData, userPrivileges);

	topicData.privileges = userPrivileges;
	topicData.topicStaleDays = meta.config.topicStaleDays;
	topicData['reputation:disabled'] = meta.config['reputation:disabled'];
	topicData['downvote:disabled'] = meta.config['downvote:disabled'];
	topicData['feeds:disableRSS'] = meta.config['feeds:disableRSS'] || 0;
	topicData.bookmarkThreshold = meta.config.bookmarkThreshold;
	topicData.necroThreshold = meta.config.necroThreshold;
	topicData.postEditDuration = meta.config.postEditDuration;
	topicData.postDeleteDuration = meta.config.postDeleteDuration;
	topicData.scrollToMyPost = settings.scrollToMyPost;
	topicData.updateUrlWithPostIndex = settings.updateUrlWithPostIndex;
	topicData.allowMultipleBadges = meta.config.allowMultipleBadges === 1;
	topicData.privateUploads = meta.config.privateUploads === 1;
	topicData.rssFeedUrl = relative_path + '/topic/' + topicData.tid + '.rss';
	if (req.loggedIn) {
		topicData.rssFeedUrl += '?uid=' + req.uid + '&token=' + rssToken;
	}

	topicData.postIndex = postIndex;

	await Promise.all([
		buildBreadcrumbs(topicData),
		addOldCategory(topicData, userPrivileges),
		addTags(topicData, req, res),
		incrementViewCount(req, tid),
		markAsRead(req, tid),
		analytics.increment(['pageviews:byCid:' + topicData.category.cid]),
	]);

	topicData.pagination = pagination.create(currentPage, pageCount, req.query);
	topicData.pagination.rel.forEach(function (rel) {
		rel.href = url + '/topic/' + topicData.slug + rel.href;
		res.locals.linkTags.push(rel);
	});

	res.render('topic', topicData);
};

function calculatePageFromIndex(postIndex, settings) {
	return 1 + Math.floor((postIndex - 1) / settings.postsPerPage);
}

function calculateStartStop(page, postIndex, settings) {
	let startSkip = 0;

	if (!settings.usePagination) {
		if (postIndex !== 0) {
			page = 1;
		}
		startSkip = Math.max(0, postIndex - Math.ceil(settings.postsPerPage / 2));
	}

	const start = ((page - 1) * settings.postsPerPage) + startSkip;
	const stop = start + settings.postsPerPage - 1;
	return { start: Math.max(0, start), stop: Math.max(0, stop) };
}

async function incrementViewCount(req, tid) {
	const allow = req.uid > 0 || (meta.config.guestsIncrementTopicViews && req.uid === 0);
	if (allow) {
		req.session.tids_viewed = req.session.tids_viewed || {};
		const now = Date.now();
		const interval = meta.config.incrementTopicViewsInterval * 60000;
		if (!req.session.tids_viewed[tid] || req.session.tids_viewed[tid] < now - interval) {
			await topics.increaseViewCount(tid);
			req.session.tids_viewed[tid] = now;
		}
	}
}

async function markAsRead(req, tid) {
	if (req.loggedIn) {
		const markedRead = await topics.markAsRead([tid], req.uid);
		const promises = [topics.markTopicNotificationsRead([tid], req.uid)];
		if (markedRead) {
			promises.push(topics.pushUnreadCount(req.uid));
		}
		await Promise.all(promises);
	}
}

async function buildBreadcrumbs(topicData) {
	const breadcrumbs = [
		{
			text: topicData.category.name,
			url: relative_path + '/category/' + topicData.category.slug,
			cid: topicData.category.cid,
		},
		{
			text: topicData.title,
		},
	];
	const parentCrumbs = await helpers.buildCategoryBreadcrumbs(topicData.category.parentCid);
	topicData.breadcrumbs = parentCrumbs.concat(breadcrumbs);
}

async function addOldCategory(topicData, userPrivileges) {
	if (userPrivileges.isAdminOrMod && topicData.oldCid) {
		topicData.oldCategory = await categories.getCategoryFields(
			topicData.oldCid, ['cid', 'name', 'icon', 'bgColor', 'color', 'slug']
		);
	}
}

async function addTags(topicData, req, res) {
	const postIndex = parseInt(req.params.post_index, 10) || 0;
	const postAtIndex = topicData.posts.find(p => parseInt(p.index, 10) === parseInt(Math.max(0, postIndex - 1), 10));
	let description = '';
	if (postAtIndex && postAtIndex.content) {
		description = utils.stripHTMLTags(utils.decodeHTMLEntities(postAtIndex.content));
	}

	if (description.length > 255) {
		description = description.substr(0, 255) + '...';
	}
	description = description.replace(/\n/g, ' ');

	res.locals.metaTags = [
		{
			name: 'title',
			content: topicData.titleRaw,
		},
		{
			name: 'description',
			content: description,
		},
		{
			property: 'og:title',
			content: topicData.titleRaw,
		},
		{
			property: 'og:description',
			content: description,
		},
		{
			property: 'og:type',
			content: 'article',
		},
		{
			property: 'article:published_time',
			content: utils.toISOString(topicData.timestamp),
		},
		{
			property: 'article:modified_time',
			content: utils.toISOString(topicData.lastposttime),
		},
		{
			property: 'article:section',
			content: topicData.category ? topicData.category.name : '',
		},
	];

	await addOGImageTags(res, topicData, postAtIndex);

	res.locals.linkTags = [
		{
			rel: 'canonical',
			href: url + '/topic/' + topicData.slug,
		},
	];

	if (!topicData['feeds:disableRSS']) {
		res.locals.linkTags.push({
			rel: 'alternate',
			type: 'application/rss+xml',
			href: topicData.rssFeedUrl,
		});
	}

	if (topicData.category) {
		res.locals.linkTags.push({
			rel: 'up',
			href: url + '/category/' + topicData.category.slug,
		});
	}
}

async function addOGImageTags(res, topicData, postAtIndex) {
	const uploads = postAtIndex ? await posts.uploads.listWithSizes(postAtIndex.pid) : [];
	const images = uploads.map((upload) => {
		upload.name = url + upload_url + '/files/' + upload.name;
		return upload;
	});
	if (topicData.thumb) {
		images.push(topicData.thumb);
	}
	if (topicData.category.backgroundImage && (!postAtIndex || !postAtIndex.index)) {
		images.push(topicData.category.backgroundImage);
	}
	if (postAtIndex && postAtIndex.user && postAtIndex.user.picture) {
		images.push(postAtIndex.user.picture);
	}
	images.forEach(path => addOGImageTag(res, path));
}

function addOGImageTag(res, image) {
	let imageUrl;
	if (typeof image === 'string' && !image.startsWith('http')) {
		imageUrl = url + image.replace(new RegExp('^' + relative_path), '');
	} else if (typeof image === 'object') {
		imageUrl = image.name;
	} else {
		imageUrl = image;
	}

	res.locals.metaTags.push({
		property: 'og:image',
		content: imageUrl,
		noEscape: true,
	}, {
		property: 'og:image:url',
		content: imageUrl,
		noEscape: true,
	});

	if (typeof image === 'object' && image.width && image.height) {
		res.locals.metaTags.push({
			property: 'og:image:width',
			content: String(image.width),
		}, {
			property: 'og:image:height',
			content: String(image.height),
		});
	}
}

topicsController.teaser = async function (req, res, next) {
	const tid = req.params.topic_id;
	if (!utils.isNumber(tid)) {
		return next();
	}
	const canRead = await privileges.topics.can('topics:read', tid, req.uid);
	if (!canRead) {
		return res.status(403).json('[[error:no-privileges]]');
	}
	const pid = await topics.getLatestUndeletedPid(tid);
	if (!pid) {
		return res.status(404).json('not-found');
	}
	const postData = await posts.getPostSummaryByPids([pid], req.uid, { stripTags: false });
	if (!postData.length) {
		return res.status(404).json('not-found');
	}
	res.json(postData[0]);
};

topicsController.pagination = async function (req, res, callback) {
	const tid = req.params.topic_id;
	const currentPage = parseInt(req.query.page, 10) || 1;

	if (!utils.isNumber(tid)) {
		return callback();
	}

	const [userPrivileges, settings, topic] = await Promise.all([
		privileges.topics.get(tid, req.uid),
		user.getSettings(req.uid),
		topics.getTopicData(tid),
	]);

	if (!topic) {
		return callback();
	}

	if (!userPrivileges.read || (topic.deleted && !userPrivileges.view_deleted)) {
		return helpers.notAllowed(req, res);
	}

	const postCount = topic.postcount;
	const pageCount = Math.max(1, Math.ceil(postCount / settings.postsPerPage));

	const paginationData = pagination.create(currentPage, pageCount);
	paginationData.rel.forEach(function (rel) {
		rel.href = url + '/topic/' + topic.slug + rel.href;
	});

	res.json({ pagination: paginationData });
};
