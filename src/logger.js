/*
 * Logger module: ability to dynamically turn on/off logging for http requests & socket.io events
 */

var fs = require('fs'),
	express = require('express'),
	winston = require('winston'),
	util = require('util'),
	socketio = require('socket.io'),
	meta = require('./meta.js');

var opts = {
	/*
	 * state used by Logger
	 */
	express : {
		app : {},
		set : 0,
		ofn : null,
	},
	streams : {
		log : { f : process.stdout },
	}
};

(function(Logger) {


	Logger.init = function(app) {
		opts.express.app = app;
		/* Open log file stream & initialize express logging if meta.config.logger* variables are set */
		Logger.setup();
	}

	Logger.setup = function() {
		Logger.setup_one('loggerPath', meta.config.loggerPath);
	}

	Logger.setup_one = function(key,value) {
		/*
		 * 1. Open the logger stream: stdout or file
		 * 2. Re-initialize the express logger hijack
		 */
		switch(key) {
			case 'loggerPath': {
				Logger.setup_one_log(value);
				Logger.express_open();
			}
			default: return;
		}
	}

	Logger.setup_one_log = function(value) {

		if(meta.config.loggerStatus > 0 || meta.config.loggerIOStatus) {
			var stream = Logger.open(value);
			if(stream) opts.streams.log.f = stream;
			else opts.streams.log.f = process.stdout;
		}
		else {
			Logger.close(opts.streams.log);
		}

	}

	Logger.open = function(value) {

		/* Open the streams to log to: either a path or stdout */
		var stream;
		if(value)
			stream = fs.createWriteStream(value, {flags: 'a'});
		else
			stream = process.stdout;

		return stream;
	}

	Logger.close = function(stream) {
		if(stream.f != process.stdout && stream.f != null) stream.end();
		stream.f = null;
	}

	Logger.monitorConfig = function(socket, data) {
		/*
		 * This monitor's when a user clicks "save" in the Logger section of the admin panel
		 */
		Logger.setup_one(data.key,data.value);
		Logger.io_close(socket);
		Logger.io(socket);
	}

	Logger.express_open = function() {
		if(opts.express.set != 1) {
			opts.express.set = 1;
			opts.express.app.use(Logger.expressLogger);
		}
		/*
		 * Always initialize "ofn" (original function) with the original logger function
		 */
		opts.express.ofn = express.logger({stream : opts.streams.log.f});
	}

	Logger.expressLogger = function(req,res,next) {
		/*
		 * The new express.logger
		 *
		 * This hijack allows us to turn logger on/off dynamically within express
		 */
		if(meta.config.loggerStatus > 0) {
			return opts.express.ofn(req,res,next);
		}
		else {
			return next()
		}
	}

	Logger.prepare_io_string = function(_type, _uid, _args) {
		/*
		 * This prepares the output string for intercepted socket.io events
		 *
		 * The format is: io: <uid> <event> <args>
		 */
		try {
			return 'io: '+_uid+' '+_type+' '+util.inspect(Array.prototype.slice.call(_args))+'\n';
		} catch(err) {
			winston.info("Logger.prepare_io_string: Failed",err)
			return "error";
		}
	}

	Logger.io_close = function(socket) {
		/*
		 * Restore all hijacked sockets to their original emit/on functions
		 */
		var clients = socket.io.sockets.clients();
		for(var v in clients) {
			var client = clients[v];

			if(client.oEmit != client.emit)
				client.emit = client.oEmit;

			if(client.$oEmit != client.$emit)
				client.$emit = client.$oEmit;
		}
	}

	Logger.io = function(socket) {
		if(socket == undefined && socket.io.sockets == undefined) {
			return;
		}

		var clients = socket.io.sockets.clients();
		for(var v in clients) {
			var client = clients[v];
			Logger.io_one(client,client.state.user.uid);
		}
	}

	Logger.io_one = function(socket,uid) {
		/*
		 * This function replaces a socket's .emit/.on functions in order to intercept events
		 */
		if(socket != undefined && meta.config.loggerIOStatus > 0) {

			(function() {
				// courtesy of: http://stackoverflow.com/a/9674248
				var user = uid
				if(!user) user = "?"
				socket.oEmit = socket.emit;
				var emit = socket.emit;
				socket.emit = function() {
					if(opts.streams.log.f != null) {
						opts.streams.log.f.write(Logger.prepare_io_string("emit",uid,arguments));
					}
					try {
						emit.apply(socket, arguments);
					} catch(err) {
						winston.info("Logger.io_one: emit.apply: Failed", err);
					}
				};
				socket.$oEmit = socket.$emit;
				var $emit = socket.$emit;
				socket.$emit = function() {

					if(opts.streams.log.f != null) {
						opts.streams.log.f.write(Logger.prepare_io_string("on",uid,arguments));
					}
					try {
                      	$emit.apply(socket, arguments);
					} catch(err) {
						winston.info("Logger.io_one: $emit.apply: Failed", err);
					}
				};
			})();
		}
	}

}(exports));
