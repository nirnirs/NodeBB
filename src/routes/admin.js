
var user = require('./../user.js'),
	topics = require('./../topics.js');

(function(Admin) {
	Admin.create_routes = function(app) {

		(function() {
			var routes = ['categories', 'users', 'topics', 'settings', 'themes', 'twitter', 'facebook', 'gplus'];

			for (var i=0, ii=routes.length; i<ii; i++) {
				(function(route) {
					app.get('/admin/' + route, function(req, res) {
						res.send(templates['admin/header'] + app.create_route('admin/' + route) + templates['admin/footer']);
					});
				}(routes[i]));
			}
		}());

		//todo consolidate.
		app.get('/admin', function(req, res) {
			res.send(templates['admin/header'] + app.create_route('admin/index') + templates['admin/footer']);
		});
		app.get('/admin/index', function(req, res) {
			res.send(templates['admin/header'] + app.create_route('admin/index') + templates['admin/footer']);
		});


		function api_method(req, res) {
			switch(req.params.method) {
				case 'users' :
					if (req.params.tab == 'search') {
						res.send(JSON.stringify({search_display: 'block', users: []}))
					} else {
						user.getUserList(function(data){
							res.send(JSON.stringify({search_display: 'none', users:data}));
						});
					}
					
					break;
				case 'categories':
					if (req.params.tab == 'disabled') {
						res.send(JSON.stringify({categories: []}));
					} else {
						categories.get(function(data) {
							res.send(JSON.stringify(data));
						});
					}
					break;
				case 'topics' :
					topics.get(function(data) {
						res.send(JSON.stringify(data));
					});
					break;
				default :
					res.send('{}');
			}
		}

		app.get('/api/admin/:method/:tab?*', api_method);
		app.get('/api/admin/:method*', api_method);
	};


}(exports));