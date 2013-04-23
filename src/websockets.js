var	SocketIO = require('socket.io').listen(global.server);

(function(io) {
	var modules = null;

	global.io = io;
	module.exports.init = function() {
		modules = global.modules;
	}


	io.sockets.on('connection', function(socket) {
		global.socket = socket;

		if (DEVELOPMENT === true) {
			// refreshing templates
			modules.templates.init();
		}

		socket.emit('event:connect', {status: 1});
		
		// BEGIN: API calls (todo: organize)
		//   julian: :^)
		socket.on('user.create', function(data) {
			modules.user.create(data.username, data.password, data.email);
		});

		socket.on('user.exists', function(data) {
			modules.user.exists(data.username);
		});

		socket.on('user.count', function(data) {
			modules.user.count(data);
		});

		socket.on('user.latest', function(data) {
			modules.user.latest(data);
		});

		socket.on('user.login', function(data) {
			modules.user.login(data);
		});

		socket.on('user.email.exists', function(data) {
			modules.user.email.exists(data.email);
		});

		socket.on('user.send_reset', function(data) {
			modules.user.send_reset(data.email);
		});
	});
	
}(SocketIO));
