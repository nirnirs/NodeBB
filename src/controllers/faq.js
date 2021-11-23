'use strict';

const helpers = require('./helpers');
const faqController = module.exports;

faqController.get = async function (_req, res) {

	res.render('faq', {
		title: '[[pages:faq]]',
		breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[pages:faq]]' }]),
	});
};
