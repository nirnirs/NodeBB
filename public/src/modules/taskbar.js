"use strict";
/*global define, app, templates*/

define('taskbar', function() {
	var taskbar = {};

	taskbar.init = function() {
		var self = this;

		templates.parse('modules/taskbar', {}, function(html) {
			self.taskbar = $(html);
			self.tasklist = self.taskbar.find('ul');
			$(document.body).append(self.taskbar);

			self.taskbar.on('click', 'li', function() {
				var	$btn = $(this),
					module = $btn.attr('data-module'),
					uuid = $btn.attr('data-uuid');

				require([module], function(module) {
					if (!$btn.hasClass('active')) {
						minimizeAll();
						module.load(uuid);
						taskbar.toggleNew(uuid, false);
						app.alternatingTitle('');

						taskbar.tasklist.removeClass('active');
						$btn.addClass('active');
					} else {
						module.minimize(uuid);
					}
				});

				return false;
			});
		});
	};

	taskbar.discard = function(module, uuid) {
		var btnEl = taskbar.tasklist.find('[data-module="' + module + '"][data-uuid="' + uuid + '"]');
		btnEl.remove();
		
		update();
	};

	taskbar.push = function(module, uuid, options) {
		var data = {
			module: module,
			uuid: uuid,
			options: options
		};

		$(window).trigger('filter:taskbar.push', data);

		var element = taskbar.tasklist.find('li[data-uuid="' + data.uuid + '"]');

		if (element.length) {
			return;
		}

		var title = $('<div></div>').text(data.options.title || 'NodeBB Task').html();

		var	btnEl = $('<li />')
			.html('<a href="#">' +
				(data.options.icon ? '<i class="fa ' + data.options.icon + '"></i> ' : '') +
				(data.options.image ? '<img src="' + data.options.image + '"/> ': '') +
				'<span>' + title + '</span>' +
				'</a>')
			.attr({
				'data-module': data.module,
				'data-uuid': data.uuid
			})
			.addClass(data.options.state !== undefined ? data.options.state : 'active');

		if (!data.options.state || data.options.state === 'active') {
			minimizeAll();
		}

		taskbar.tasklist.append(btnEl);
		update();
	};

	taskbar.minimize = function(module, uuid) {
		var btnEl = taskbar.tasklist.find('[data-module="' + module + '"][data-uuid="' + uuid + '"]');
		btnEl.removeClass('active');
	};

	taskbar.toggleNew = function(uuid, state) {
		var btnEl = taskbar.tasklist.find('[data-uuid="' + uuid + '"]');
		btnEl.toggleClass('new', state);
	};

	taskbar.updateActive = function(uuid) {
		var	tasks = taskbar.tasklist.find('li');
		tasks.removeClass('active');
		tasks.filter('[data-uuid="' + uuid + '"]').addClass('active');
	};

	taskbar.isActive = function(uuid) {
		var taskBtn = taskbar.tasklist.find('li[data-uuid="' + uuid + '"]');
		return taskBtn.hasClass('active');
	};

	function update() {
		var	tasks = taskbar.tasklist.find('li');

		if (tasks.length > 0) {
			taskbar.taskbar.attr('data-active', '1');
		} else {
			taskbar.taskbar.removeAttr('data-active');
		}
	}

	function minimizeAll() {
		taskbar.tasklist.find('.active').removeClass('active');
	}

	return taskbar;
});
