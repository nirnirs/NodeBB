'use strict';

const prompt = require('prompt');
const request = require('request-promise-native');
const cproc = require('child_process');
const semver = require('semver');
const fs = require('fs');
const path = require('path');
const nconf = require('nconf');
const util = require('util');

const { paths, pluginNamePattern } = require('../constants');

const packageManager = nconf.get('package_manager');

const supportedPackageManagerList = require('./package-install').supportedPackageManager; // load config from src/cli/package-install.js

let packageManagerExecutable = supportedPackageManagerList.indexOf(packageManager) >= 0 ? packageManager : 'npm';
const packageManagerInstallArgs = packageManager === 'yarn' ? ['add'] : ['install', '--save'];

if (process.platform === 'win32') {
	packageManagerExecutable += '.cmd';
}

async function getModuleVersions(modules) {
	const versionHash = {};
	const batch = require('../batch');
	await batch.processArray(modules, async (moduleNames) => {
		await Promise.all(moduleNames.map(async (module) => {
			let pkg = await fs.promises.readFile(
				path.join(paths.nodeModules, module, 'package.json'), { encoding: 'utf-8' }
			);
			pkg = JSON.parse(pkg);
			versionHash[module] = pkg.version;
		}));
	}, {
		batch: 50,
	});

	return versionHash;
}

async function getInstalledPlugins() {
	let [deps, bundled] = await Promise.all([
		fs.promises.readFile(paths.currentPackage, { encoding: 'utf-8' }),
		fs.promises.readFile(paths.installPackage, { encoding: 'utf-8' }),
	]);

	deps = Object.keys(JSON.parse(deps).dependencies)
		.filter(pkgName => pluginNamePattern.test(pkgName));
	bundled = Object.keys(JSON.parse(bundled).dependencies)
		.filter(pkgName => pluginNamePattern.test(pkgName));


	// Whittle down deps to send back only extraneously installed plugins/themes/etc
	const checklist = deps.filter((pkgName) => {
		if (bundled.includes(pkgName)) {
			return false;
		}

		// Ignore git repositories
		try {
			fs.accessSync(path.join(paths.nodeModules, pkgName, '.git'));
			return false;
		} catch (e) {
			return true;
		}
	});

	return await getModuleVersions(checklist);
}

async function getCurrentVersion() {
	let pkg = await fs.promises.readFile(paths.installPackage, { encoding: 'utf-8' });
	pkg = JSON.parse(pkg);
	return pkg.version;
}

async function getSuggestedModules(nbbVersion, toCheck) {
	let body = await request({
		method: 'GET',
		url: `https://packages.nodebb.org/api/v1/suggest?version=${nbbVersion}&package[]=${toCheck.join('&package[]=')}`,
		json: true,
	});
	if (!Array.isArray(body) && toCheck.length === 1) {
		body = [body];
	}
	return body;
}

async function checkPlugins() {
	process.stdout.write('Checking installed plugins and themes for updates... ');
	const [plugins, nbbVersion] = await Promise.all([
		getInstalledPlugins,
		getCurrentVersion,
	]);

	const toCheck = Object.keys(plugins);
	if (!toCheck.length) {
		process.stdout.write('  OK'.green + ''.reset);
		return [];	// no extraneous plugins installed
	}
	const suggestedModules = await getSuggestedModules(nbbVersion, toCheck);
	process.stdout.write('  OK'.green + ''.reset);

	let current;
	let suggested;
	const upgradable = suggestedModules.map((suggestObj) => {
		current = plugins[suggestObj.package];
		suggested = suggestObj.version;

		if (suggestObj.code === 'match-found' && semver.gt(suggested, current)) {
			return {
				name: suggestObj.package,
				current: current,
				suggested: suggested,
			};
		}
		return null;
	}).filter(Boolean);

	return upgradable;
}

async function upgradePlugins() {
	try {
		const found = await checkPlugins();
		if (found && found.length) {
			process.stdout.write(`\n\nA total of ${String(found.length).bold} package(s) can be upgraded:\n\n`);
			found.forEach((suggestObj) => {
				process.stdout.write(`${'  * '.yellow + suggestObj.name.reset} (${suggestObj.current.yellow}${' -> '.reset}${suggestObj.suggested.green}${')\n'.reset}`);
			});
		} else {
			console.log('\nAll packages up-to-date!'.green + ''.reset);
			return;
		}

		prompt.message = '';
		prompt.delimiter = '';

		const promptGet = util.promisify((schema, callback) => prompt.get(schema, callback));
		prompt.start();
		const result = await promptGet({
			name: 'upgrade',
			description: '\nProceed with upgrade (y|n)?'.reset,
			type: 'string',
		});

		if (['y', 'Y', 'yes', 'YES'].includes(result.upgrade)) {
			console.log('\nUpgrading packages...');
			const args = packageManagerInstallArgs.concat(found.map(suggestObj => `${suggestObj.name}@${suggestObj.suggested}`));

			cproc.execFileSync(packageManagerExecutable, args, { stdio: 'ignore' });
		} else {
			console.log('Package upgrades skipped'.yellow + '. Check for upgrades at any time by running "'.reset + './nodebb upgrade -p'.green + '".'.reset);
		}
	} catch (err) {
		console.log('Warning'.yellow + ': An unexpected error occured when attempting to verify plugin upgradability'.reset);
		throw err;
	}
}

exports.upgradePlugins = upgradePlugins;
