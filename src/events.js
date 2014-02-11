

var fs = require('fs'),
	path = require('path'),
	nconf = require('nconf'),
	user = require('./user');


(function(events) {
	var logFileName = 'events.log';

	events.logPasswordChange = function(uid) {
		logWithUser(uid, 'changed password');
	}

	events.logPasswordReset = function(uid) {
		logWithUser(uid, 'reset password');
	}

	events.logEmailChange = function(uid, oldEmail, newEmail) {
		logWithUser(uid,'changed email from "' + oldEmail + '" to "' + newEmail +'"');
	}

	events.logUsernameChange = function(uid, oldUsername, newUsername) {
		logWithUser(uid,'changed username from "' + oldUsername + '" to "' + newUsername +'"');
	}

	events.logAdminLogin = function(uid) {
		logWithUser(uid, 'logged into admin panel');
	}

	events.logPostEdit = function(uid, pid) {
		logWithUser(uid, 'edited post (pid ' + pid + ')');
	}

	events.logPostDelete = function(uid, pid) {
		logWithUser(uid, 'deleted post (pid ' + pid + ')');
	}

	events.logPostRestore = function(uid, pid) {
		logWithUser(uid, 'restored post (pid ' + pid + ')');
	}

	events.logTopicDelete = function(uid, tid) {
		logWithUser(uid, 'deleted topic (tid ' + tid + ')');
	}

	events.logTopicRestore = function(uid, tid) {
		logWithUser(uid, 'restored topic (tid ' + tid + ')');
	}

	function logWithUser(uid, string) {

		user.getUserField(uid, 'username', function(err, username) {
			if(err) {
				winston.error('Error logging event. ' + err.message);
				return;
			}

			var msg = '[' + new Date().toUTCString() + '] - ' + username + '(uid ' + uid + ') ' + string;
			log(msg);
		});
	}

	events.log = function(msg) {
		var logFile = path.join(nconf.get('base_dir'), logFileName);

		fs.appendFile(logFile, msg + '\n', function(err) {
			if(err) {
				winston.error('Error logging event. ' + err.message);
				return;
			}
		});
	}

	events.getLog = function(callback) {
		var logFile = path.join(nconf.get('base_dir'), logFileName);

		fs.readFile(logFile, callback);
	}

}(module.exports));