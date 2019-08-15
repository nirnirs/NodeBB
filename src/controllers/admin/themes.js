'use strict';

const path = require('path');
const fs = require('fs');
const util = require('util');
const readFileAsync = util.promisify(fs.readFile);

const file = require('../../file');

const themesController = module.exports;

const defaultScreenshotPath = path.join(__dirname, '../../../public/images/themes/default.png');

themesController.get = async function (req, res, next) {
	const themeDir = path.join(__dirname, '../../../node_modules', req.params.theme);
	const themeConfigPath = path.join(themeDir, 'theme.json');

	let themeConfig;
	try {
		themeConfig = await readFileAsync(themeConfigPath, 'utf8');
		themeConfig = JSON.parse(themeConfig);
	} catch (err) {
		if (err.code === 'ENOENT') {
			return next(Error('invalid-data'));
		}
		return next(err);
	}

	const screenshotPath = themeConfig.screenshot ? path.join(themeDir, themeConfig.screenshot) : defaultScreenshotPath;
	const exists = await file.exists(screenshotPath);
	res.sendFile(exists ? screenshotPath : defaultScreenshotPath);
};
