define(['forum/admin/settings'], function(Settings) {
	var Themes = {};

	Themes.init = function() {
		var scriptEl = document.createElement('script');
		scriptEl.src = 'http://api.bootswatch.com/3/?callback=bootswatchListener';
		document.body.appendChild(scriptEl);

		var bootstrapThemeContainer = document.querySelector('#bootstrap_themes'),
			installedThemeContainer = document.querySelector('#installed_themes'),
			themeEvent = function(e) {
				if (e.target.hasAttribute('data-action')) {
					switch (e.target.getAttribute('data-action')) {
						case 'use':
							var parentEl = $(e.target).parents('li'),
								themeType = parentEl.attr('data-type'),
								cssSrc = parentEl.attr('data-css'),
								themeId = parentEl.attr('data-theme');

							socket.emit('admin.themes.set', {
								type: themeType,
								id: themeId,
								src: cssSrc
							}, function(err) {
								app.alert({
									alert_id: 'admin:theme',
									type: 'success',
									title: 'Theme Changed',
									message: 'You have successfully changed your NodeBB\'s theme. Please restart to see the changes.',
									timeout: 2500
								});
							});
						break;
					}
				}
			};

		bootstrapThemeContainer.addEventListener('click', themeEvent);
		installedThemeContainer.addEventListener('click', themeEvent);

		var revertEl = document.getElementById('revert_theme');
		revertEl.addEventListener('click', function() {
			bootbox.confirm('Are you sure you wish to remove the custom theme and restore the NodeBB default theme?', function(confirm) {
				if (confirm) {
					socket.emit('admin.themes.set', {
						type: 'local',
						id: 'nodebb-theme-cerulean'
					}, function(err) {
						app.alert({
							alert_id: 'admin:theme',
							type: 'success',
							title: 'Theme Changed',
							message: 'You have successfully reverted your NodeBB back to it\'s default theme. Please restart to see the changes.',
							timeout: 3500
						});
					});
				}
			});
		}, false);

		// Installed Themes
		socket.emit('admin.themes.getInstalled', function(err, themes) {
			if(err) {
				return app.alertError(err.message);
			}

			var instListEl = document.getElementById('installed_themes'),
				themeFrag = document.createDocumentFragment(),
				liEl = document.createElement('li');
				liEl.setAttribute('data-type', 'local');

			if (themes.length > 0) {
				for (var x = 0, numThemes = themes.length; x < numThemes; x++) {
					liEl.setAttribute('data-theme', themes[x].id);
					liEl.innerHTML = '<img src="' + (themes[x].screenshot ? '/css/previews/' + themes[x].id : RELATIVE_PATH + '/images/themes/default.png') + '" />' +
						'<div>' +
						'<div class="pull-right">' +
						'<button class="btn btn-primary" data-action="use">Use</button> ' +
						'</div>' +
						'<h4>' + themes[x].name + '</h4>' +
						'<p>' +
						themes[x].description +
						(themes[x].url ? ' (<a href="' + themes[x].url + '">Homepage</a>)' : '') +
						'</p>' +
						'</div>' +
						'<div class="clear">';
					themeFrag.appendChild(liEl.cloneNode(true));
				}
			} else {
				// No themes found
				liEl.className = 'no-themes';
				liEl.innerHTML = 'No installed themes found';
				themeFrag.appendChild(liEl);
			}

			instListEl.innerHTML = '';
			instListEl.appendChild(themeFrag);
		});

		// Proper tabbing for "Custom CSS" field
		var	customCSSEl = $('textarea[data-field]')[0];
		tabIndent.config.tab = '    ';
		tabIndent.render(customCSSEl);

		Themes.prepareWidgets();

		Settings.prepare();
	}

	Themes.render = function(bootswatch) {
		var themeFrag = document.createDocumentFragment(),
			themeEl = document.createElement('li'),
			themeContainer = document.querySelector('#bootstrap_themes'),
			numThemes = bootswatch.themes.length;

		themeEl.setAttribute('data-type', 'bootswatch');

		for (var x = 0; x < numThemes; x++) {
			var theme = bootswatch.themes[x];
			themeEl.setAttribute('data-css', theme.cssCdn);
			themeEl.setAttribute('data-theme', theme.name);
			themeEl.innerHTML = '<img src="' + theme.thumbnail + '" />' +
				'<div>' +
				'<div class="pull-right">' +
				'<button class="btn btn-primary" data-action="use">Use</button> ' +
				'</div>' +
				'<h4>' + theme.name + '</h4>' +
				'<p>' + theme.description + '</p>' +
				'</div>' +
				'<div class="clear">';
			themeFrag.appendChild(themeEl.cloneNode(true));
		}
		themeContainer.innerHTML = '';
		themeContainer.appendChild(themeFrag);
	}

	Themes.prepareWidgets = function() {
		$('#widgets .available-widgets .panel').draggable({
			helper: function(e) {
				return $(e.target).parents('.panel').clone().addClass('block').width($(e.target.parentNode).width());
			},
			connectToSortable: ".widget-area"
		});

		$('#widgets .available-containers .containers > [data-container-html]').draggable({
			helper: function(e) {
				var target = $(e.target);
				target = target.attr('data-container-html') ? target : target.parents('[data-container-html]');

				return target.clone().addClass('block').width(target.width()).css('opacity', '0.5');
			}
		});

		function appendToggle(el) {
			if (!el.hasClass('block')) {
				el.addClass('block')
					.droppable({
						drop: function(event, ui) {
							var el = $(this);

							el.find('.panel-body .container-html').val(ui.draggable.attr('data-container-html'));
							el.find('.panel-body').removeClass('hidden');
						},
						hoverClass: "panel-info"
					})
					.children('.panel-heading')
						.append('<div class="pull-right pointer"><span class="delete-widget"><i class="fa fa-times-circle"></i></span>&nbsp;<span class="toggle-widget"><i class="fa fa-chevron-down"></i></span></div>')
						.children('small').html('');
			}
		}

		$('#widgets .widget-area').sortable({
			update: function (event, ui) {
				appendToggle(ui.item);
			},
			connectWith: "div"
		}).on('click', '.toggle-widget', function() {
			$(this).parents('.panel').children('.panel-body').toggleClass('hidden');
		}).on('click', '.delete-widget', function() {
			var panel = $(this).parents('.panel');

			bootbox.confirm('Are you sure you wish to delete this widget?', function(confirm) {
				if (confirm) {
					panel.remove();
				}
			});
		});

		$('#widgets .btn[data-template]').on('click', function() {
			var btn = $(this),
				template = btn.attr('data-template'),
				location = btn.attr('data-location'),
				area = btn.parents('.area').children('.widget-area'),
				widgets = [];

			area.find('.panel[data-widget]').each(function() {
				var widgetData = {},
					data = $(this).find('form').serializeArray();

				for (var d in data) {
					if (data.hasOwnProperty(d)) {
						if (data[d].name) {
							widgetData[data[d].name] = data[d].value;	
						}
					}
				}

				widgets.push({
					widget: this.getAttribute('data-widget'),
					data: widgetData
				});
			});

			socket.emit('admin.widgets.set', {
				template: template,
				location: location,
				widgets: widgets
			}, function(err) {
				app.alert({
					alert_id: 'admin:widgets',
					type: err ? 'danger' : 'success',
					title: err ? 'Error' : 'Widgets Updated',
					message: err ? err : 'Successfully updated widgets',
					timeout: 2500
				});
			});
		});

		function populateWidget(widget, data) {
			widget.find('input, textarea').each(function() {
				var input = $(this),
					value = data[input.attr('name')];

				if (this.type === 'checkbox') {
					input.attr('checked', !!value);
				} else {
					input.val(value);
				}
			});

			return widget;
		}
		
		$.get(RELATIVE_PATH + '/api/admin/themes', function(data) {
			var areas = data.areas;

			for (var a in areas) {
				if (areas.hasOwnProperty(a)) {
					var area = areas[a],
						widgetArea = $('#widgets .area [data-template="' + area.template + '"][data-location="' + area.location + '"]').parents('.area').find('.widget-area');

					for (var i in area.data) {
						if (area.data.hasOwnProperty(i)) {
							var data = area.data[i],
								widgetEl = $('.available-widgets [data-widget="' + data.widget + '"]').clone();

							widgetArea.append(populateWidget(widgetEl, data.data));
							appendToggle(widgetEl);
						}
					}


				}
			}
		});
	};

	return Themes;
});