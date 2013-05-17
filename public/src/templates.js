

(function (module) {
	
	var ready_callback,
		config = {},
		templates,
		fs = null,
		available_templates = [];

	module.exports = templates = {};

	try {
		fs = require('fs');
	} catch (e) {}

	templates.force_refresh = function(tpl) {
		return !!config.force_refresh[tpl];
	}

	templates.get_custom_map = function(tpl) {
		if (config['custom_mapping'] && tpl) {
			for (var pattern in config['custom_mapping']) {
				if (tpl.match(pattern)) {
					return (config['custom_mapping'][pattern]);
				}
			}
		}

		return false;
	}

	templates.is_available = function(tpl) {
		return !!jQuery.inArray(tpl, available_templates);
	};

	templates.ready = function(callback) {
		if (callback == null && ready_callback) ready_callback();
		else ready_callback = callback;
	};

	templates.prepare = function(raw_tpl, data) {
		var template = {};
		template.html = raw_tpl;
		template.parse = parse;
		template.blocks = {};

		return template; 		
	};

	function loadTemplates(templatesToLoad) {
		function loadServer() {
			var loaded = templatesToLoad.length;

			for (var t in templatesToLoad) {
				(function(file) {
					fs.readFile(global.configuration.ROOT_DIRECTORY + '/public/templates/' + file + '.tpl', function(err, html) {
						var template = function() {
							this.toString = function() {
								return this.html;
							};
						}

						template.prototype.file = file;
						template.prototype.parse = parse;
						template.prototype.html = String(html);
						
						global.templates[file] = new template;

						loaded--;
						if (loaded == 0) templates.ready();
					});
				}(templatesToLoad[t]));
			}
		}

		function loadClient() {
			jQuery.when(jQuery.getJSON('/templates/config.json'), jQuery.getJSON('/api/get_templates_listing')).done(function(config_data, templates_data) {
				config = config_data[0];
				available_templates = templates_data[0];
				templates.ready();
			});
		}
		
		if (fs === null) loadClient();
		else loadServer();
	}


	templates.init = function(templates_to_load) {
		loadTemplates(templates_to_load || []);
	}



	templates.load_template = function(callback, url, template) {
		var location = document.location || window.location,
			rootUrl = location.protocol + '//' + (location.hostname || location.host) + (location.port ? ':' + location.port : '');

		var api_url = (url === '' || url === '/') ? 'home' : url;

		var tpl_url = templates.get_custom_map(url);
		if (tpl_url == false && !templates[api_url]) {
			tpl_url = api_url.split('/')[0];
		} else {
			tpl_url = api_url;
		}
		
		var template_data = null;


		(function() {
			var timestamp = new Date().getTime(); //debug

			if (!templates[tpl_url]) {
				jQuery.get('/templates/' + tpl_url + '.tpl?v=' + timestamp, function(html) {
					var template = function() {
						this.toString = function() {
							return this.html;
						};
					}

					template.prototype.parse = parse;
					template.prototype.html = String(html);
					template.prototype.blocks = {};

					templates[tpl_url] = new template;
					
					parse_template();
				});
			} else {
				parse_template();
			}
			
		}());
			
		(function() {
			jQuery.get(API_URL + api_url, function(data) {
				if(!data) {
					window.location.href = '/404';
					return;
				}

				template_data = data;
				parse_template();
			});
		}());
		

		function parse_template() {
			if (!templates[tpl_url] || !template_data) return;

			document.getElementById('content').innerHTML = templates[tpl_url].parse(JSON.parse(template_data));
			if (callback) callback(true);
		}

	}



	//modified from https://github.com/psychobunny/dcp.templates
	var parse = function(data) {
		var self = this;

		function replace(key, value, template) {
			var searchRegex = new RegExp('{' + key + '}', 'g');
			return template.replace(searchRegex, value);
		}

		function makeRegex(block) {
			return new RegExp("<!-- BEGIN " + block + " -->[^]*<!-- END " + block + " -->", 'g');
		}

		function getBlock(regex, block, template) {
			data = template.match(regex);			
			if (data == null) return;

			if (block !== undefined) self.blocks[block] = data[0];

			data = data[0]
				.replace("<!-- BEGIN " + block + " -->", "")
				.replace("<!-- END " + block + " -->", "");

			return data;
		}

		function setBlock(regex, block, template) {
			return template.replace(regex, block);
		}

		var template = this.html, regex, block;

		return (function parse(data, namespace, template) {
			if (!data || data.length == 0) {
				template = '';
			}

			for (var d in data) {
				if (data.hasOwnProperty(d)) {
					if (data[d] === null) {
						template = replace(namespace + d, '', template);
					} else if (data[d].constructor == Array) {
						namespace += d;
						
						regex = makeRegex(d),
						block = getBlock(regex, namespace, template)
						if (block == null) continue;

						var numblocks = data[d].length - 1, i = 0, result = "";

						do {
							result += parse(data[d][i], namespace + '.', block);
						} while (i++ < numblocks);

						namespace = namespace.replace(d, '');
						template = setBlock(regex, result, template);
					} else if (data[d] instanceof Object) {
						namespace += d + '.';
						
						regex = makeRegex(d),
						block = getBlock(regex, namespace, template)
						if (block == null) continue;

						block = parse(data[d], namespace, block);
						template = setBlock(regex, block, template);
					} else {								
						template = replace(namespace + d, data[d], template);
					}
				}
			}

			if (namespace) {
				var regex = new RegExp("{" + namespace + "[^]*?}", 'g');
				template = template.replace(regex, '');
			}

			return template;
			
		})(data, "", template);
	}


	

	if ('undefined' !== typeof window) {
		window.templates = module.exports;
		templates.init();
	}

})('undefined' === typeof module ? {module:{exports:{}}} : module)



