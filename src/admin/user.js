var	RDB = require('./../redis.js'),
	utils = require('./../../public/src/utils.js'),
	user = require('./../user.js');

(function(UserAdmin) {

	UserAdmin.makeAdmin = function(uid, theirid, socket) {
		user.isAdministrator(uid, function(isAdmin) {
			if(isAdmin) {
				user.makeAdministrator(theirid, function(data) {
					socket.emit('event:alert', {
						title: 'User Modified',
						message: 'This user is now an administrator!',
						type: 'success',
						timeout: 2000
					});					
				});
			}
		});
	};

	UserAdmin.removeAdmin = function(uid, theirid, socket) {
		user.isAdministrator(uid, function(isAdmin) {
			if(isAdmin) {
				user.removeAdministrator(theirid, function(data) {

					socket.emit('event:alert', {
						title: 'User Modified',
						message: 'This user is no longer an administrator!',
						type: 'success',
						timeout: 2000
					});
				});
			}
		});
	};

}(exports));

