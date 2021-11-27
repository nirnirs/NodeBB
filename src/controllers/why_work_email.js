'use strict';

const helpers = require('./helpers');
const whyWorkEmailController = module.exports;

whyWorkEmailController.get = async function(_req, res) {

    res.render('why_work_email', {
        title: '[[pages:why-work-email]]',
        breadcrumbs: helpers.buildBreadcrumbs([{ text: '[[pages:why-work-email]]' }]),
    });
};