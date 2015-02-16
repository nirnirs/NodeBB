"use strict";

var express = require('express'),

	posts = require('../posts'),
	categories = require('../categories'),
	uploadsController = require('../controllers/uploads'),
	templatesController = require('../controllers/templates');

module.exports =  function(app, middleware, controllers) {

	var router = express.Router();
	app.use('/api', router);

	router.get('/config', middleware.applyCSRF, controllers.api.getConfig);
	router.get('/widgets/render', controllers.api.renderWidgets);

	router.get('/user/uid/:uid', middleware.checkGlobalPrivacySettings, controllers.accounts.getUserByUID);
	router.get('/get_templates_listing', templatesController.getTemplatesListing);
	router.get('/categories/:cid/moderators', getModerators);
	router.get('/recent/posts/:term?', getRecentPosts);

	var multipart = require('connect-multiparty');
	var multipartMiddleware = multipart();
	var middlewares = [multipartMiddleware, middleware.validateFiles, middleware.applyCSRF];
	router.post('/post/upload', middlewares, uploadsController.uploadPost);
	router.post('/topic/thumb/upload', middlewares, uploadsController.uploadThumb);
	router.post('/user/:userslug/uploadpicture', middlewares.concat([middleware.authenticate, middleware.checkGlobalPrivacySettings, middleware.checkAccountPermissions]), controllers.accounts.uploadPicture);
};

function getModerators(req, res, next) {
	categories.getModerators(req.params.cid, function(err, moderators) {
		res.json({moderators: moderators});
	});
}


function getRecentPosts(req, res, next) {
	var uid = (req.user) ? req.user.uid : 0;

	posts.getRecentPosts(uid, 0, 19, req.params.term, function (err, data) {
		if(err) {
			return next(err);
		}

		res.json(data);
	});
}