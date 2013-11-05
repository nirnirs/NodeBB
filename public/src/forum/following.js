define(['forum/accountheader'], function(header) {
	var	Following = {};

	Following.init = function() {
		header.init();

		var followingCount = templates.get('followingCount');

		if (parseInt(followingCount, 10) === 0) {
			$('#no-following-notice').removeClass('hide');
		}

		app.addCommasToNumbers();
	};

	return Following;
});