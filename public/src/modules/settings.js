"use strict";
/* global define, socket, app */

/*
	settings.js 2.0, because version 1:
		- saved everything in "config" hash
		- was hand-rolled (mm, salmon hand roll)
		- Relied on app.config (!!)
	This module should:
		- Allow you to save to any specified hash
		- Rely on jQuery
		- Use sockets
		- Be more awesome
*/

define(function() {
	var Settings = {};

	Settings.load = function(hash, formEl) {
		socket.emit('modules.settings.get', {
			hash: hash
		}, function(err, values) {
			if (!err) {
				$(formEl).deserialize(values);
			} else {
				console.log('[settings] Unable to load settings for hash: ', hash);
			}
		});
	};

	Settings.save = function(hash, formEl) {
		var	formEl = $(formEl);
		if (formEl.length) {
			var	values = formEl.serializeObject();

			socket.emit('modules.settings.set', {
				hash: hash,
				values: values
			}, function(err) {
				app.alert({
					title: 'Settings Saved',
					message: 'Restarting NodeBB <i class="fa fa-spin fa-refresh"></i>',
					type: 'success',
					timeout: 2500
				});
			});
		} else {
			console.log('[settings] Form not found.');
		}
	};

	return Settings;
});