define(['uploader'], function(uploader) {
	var	Categories = {};

	Categories.init = function() {
		var modified_categories = {};

		function modified(el) {
			var cid = $(el).parents('li').attr('data-cid');
			if(cid) {
				modified_categories[cid] = modified_categories[cid] || {};
				modified_categories[cid][$(el).attr('data-name')] = $(el).val();
			}
		}

		function save() {
			if(Object.keys(modified_categories).length) {
				socket.emit('admin.categories.update', modified_categories, function(err, result) {
					if (err) {
						return app.alertError(err.message);
					}

					if (result && result.length) {
						app.alert({
							title: 'Updated Categories',
							message: 'Category IDs ' + result.join(', ') + ' was successfully updated.',
							type: 'success',
							timeout: 2000
						});
					}
				});
				modified_categories = {};
			}
			return false;
		}

		function select_icon(el) {
			var selected = el.attr('class').replace(' fa-2x', '');
			$('#icons .selected').removeClass('selected');
			if (selected)
				$('#icons .' + selected).parent().addClass('selected');


			bootbox.confirm('<h2>Select an icon.</h2>' + document.getElementById('icons').innerHTML, function(confirm) {
				if (confirm) {
					var iconClass = $('.bootbox .selected').children(':first').attr('class');

					el.attr('class', iconClass + ' fa-2x');

					// remove the 'fa ' from the class name, just need the icon name itself
					var categoryIconClass = iconClass.replace('fa ', '');
					el.val(categoryIconClass);
					el.attr('value', categoryIconClass);

					modified(el);
				}
			});

			setTimeout(function() { //bootbox was rewritten for BS3 and I had to add this timeout for the previous code to work. TODO: to look into
				$('.bootbox .col-md-3').on('click', function() {
					$('.bootbox .selected').removeClass('selected');
					$(this).addClass('selected');
				});
			}, 500);
		}


		function update_blockclass(el) {
			el.parentNode.parentNode.className = 'entry-row ' + el.value;
		}

		function updateCategoryOrders() {
			var categories = $('.admin-categories #entry-container').children();
			for(var i = 0; i<categories.length; ++i) {
				var input = $(categories[i]).find('input[data-name="order"]');

				input.val(i+1).attr('data-value', i+1);
				modified(input);
			}
		}

		$('#entry-container').sortable({
			stop: function(event, ui) {
				updateCategoryOrders();
			},
			distance: 10
		});
		$('.blockclass').each(function() {
			var $this = $(this);
			$this.val($this.attr('data-value'));
		});


		function showCreateCategoryModal() {
			$('#new-category-modal').modal();
		}

		function createNewCategory() {
			var category = {
				name: $('#inputName').val(),
				description: $('#inputDescription').val(),
				icon: $('#new-category-modal i').attr('value'),
				bgColor: '#0059b2',
				color: '#fff',
				order: $('.admin-categories #entry-container').children().length + 1
			};

			socket.emit('admin.categories.create', category, function(err, data) {
				if(err) {
					return app.alertError(err.message);
				}

				app.alert({
					alert_id: 'category_created',
					title: 'Created',
					message: 'Category successfully created!',
					type: 'success',
					timeout: 2000
				});

				var html = templates.prepare(templates['admin/categories'].blocks['categories']).parse({
					categories: [data]
				});
				html = $(html);
				html.find('[data-name="bgColor"], [data-name="color"]').each(enableColorPicker);

				$('#entry-container').append(html);
				$('#new-category-modal').modal('hide');
			});
		}

		function enableColorPicker(idx, inputEl) {
			var	$inputEl = $(inputEl),
				previewEl = $inputEl.parents('[data-cid]').find('.preview-box');

			$inputEl.ColorPicker({
				color: $inputEl.val() || '#000',
				onChange: function(hsb, hex) {
					$inputEl.val('#' + hex);
					if ($inputEl.attr('data-name') === 'bgColor') previewEl.css('background', '#' + hex);
					else if ($inputEl.attr('data-name') === 'color') previewEl.css('color', '#' + hex);
					modified($inputEl[0]);
				}
			});
		}

		$(function() {
			var url = window.location.href,
				parts = url.split('/'),
				active = parts[parts.length - 1];

			$('.nav-pills li').removeClass('active');
			$('.nav-pills li a').each(function() {
				var $this = $(this);
				if ($this.attr('href').match(active)) {
					$this.parent().addClass('active');
					return false;
				}
			});


			$('#addNew').on('click', showCreateCategoryModal);
			$('#create-category-btn').on('click', createNewCategory);

			$('#entry-container').on('click', '.icon', function(ev) {
				select_icon($(this).find('i'));
			});

			$('#new-category-modal').on('click', '.icon', function(ev) {
				select_icon($(this).find('i'));
			});

			$('.admin-categories form input').on('change', function(ev) {
				modified(ev.target);
			});

			$('.dropdown').on('click', '[data-disabled]', function(ev) {
				var btn = $(this),
					categoryRow = btn.parents('li'),
					cid = categoryRow.attr('data-cid'),
					disabled = btn.attr('data-disabled') === 'false' ? '1' : '0';

				categoryRow.remove();
				modified_categories[cid] = modified_categories[cid] || {};
				modified_categories[cid]['disabled'] = disabled;

				save();
				return false;
			});

			// Colour Picker
			$('[data-name="bgColor"], [data-name="color"]').each(enableColorPicker);

			$('.admin-categories').on('click', '.save', save);

			// Permissions modal
			$('.admin-categories').on('click', '.permissions', function() {
				var	cid = $(this).parents('li[data-cid]').attr('data-cid');
				Categories.launchPermissionsModal(cid);
			});


			$('.admin-categories').on('click', '.upload-button', function() {
				var inputEl = $(this),
					cid = inputEl.parents('li[data-cid]').attr('data-cid');

				uploader.open(RELATIVE_PATH + '/admin/category/uploadpicture', {cid: cid}, 0, function(imageUrlOnServer) {
					inputEl.val(imageUrlOnServer);
					var previewBox = inputEl.parents('li[data-cid]').find('.preview-box');
					previewBox.css('background', 'url(' + imageUrlOnServer + '?' + new Date().getTime() + ')')
						.css('background-size', 'cover');
					modified(inputEl[0]);
				});
			});

			$('.admin-categories').on('click', '.delete-image', function() {
				var parent = $(this).parents('li[data-cid]'),
					inputEl = parent.find('.upload-button'),
					preview = parent.find('.preview-box'),
					bgColor = parent.find('.category_bgColor').val();

				inputEl.val('');
				modified(inputEl[0]);

				preview.css('background', bgColor);

				$(this).addClass('hide').hide();
			});
		});
	};

	Categories.launchPermissionsModal = function(cid) {
		var	modal = $('#category-permissions-modal'),
			searchEl = modal.find('#permission-search'),
			resultsEl = modal.find('.search-results'),
			groupsResultsEl = modal.find('.groups-results'),
			searchDelay;

		searchEl.off().on('keyup', function() {
			var	searchEl = this,
				liEl;

			clearTimeout(searchDelay);

			searchDelay = setTimeout(function() {
				socket.emit('admin.categories.search', {
					username: searchEl.value,
					cid: cid
				}, function(err, results) {
					if(err) {
						return app.alertError(err.message);
					}

					var	numResults = results.length,
						resultObj;
					for(var x = 0; x < numResults; x++) {
						resultObj = results[x];
						liEl = $('<li />')
							.attr('data-uid', resultObj.uid)
							.html('<div class="pull-right">' +
								'<div class="btn-group">' +
								'<button type="button" data-priv="+r" class="btn btn-default' + (resultObj.privileges['+r'] ? ' active' : '') + '">Read</button>' +
								'<button type="button" data-priv="+w" class="btn btn-default' + (resultObj.privileges['+w'] ? ' active' : '') + '">Write</button>' +
								'<button type="button" data-priv="mods" class="btn btn-default' + (resultObj.privileges['mods'] ? ' active' : '') + '">Moderator</button>' +
								'</div>' +
								'</div>' +
								'<img src="' + resultObj.picture + '" /> ' + resultObj.username);

						resultsEl.append(liEl);
					}
				});
			}, 250);
		});

		Categories.refreshPrivilegeList(cid);

		resultsEl.off().on('click', '[data-priv]', function(e) {
			var	btnEl = $(this),
				uid = btnEl.parents('li[data-uid]').attr('data-uid'),
				privilege = btnEl.attr('data-priv');
			e.preventDefault();

			socket.emit('admin.categories.setPrivilege', {
				cid: cid,
				uid: uid,
				privilege: privilege,
				set: !btnEl.hasClass('active')
			}, function(err, privileges) {
				btnEl.toggleClass('active', privileges[privilege]);

				Categories.refreshPrivilegeList(cid);
			});
		});

		modal.off().on('click', '.members li > img', function() {
			searchEl.val($(this).attr('title'));
			searchEl.keyup();
		});

		// User Groups and privileges
		socket.emit('admin.categories.groupsList', cid, function(err, results) {
			if(err) {
				return app.alertError(err.message);
			}
			var numResults = results.length,
				trEl,
				resultObj;

			groupsResultsEl.empty();

			for(var x = 0; x < numResults; x++) {
				resultObj = results[x];
				trEl = $('<tr />')
					.attr('data-gid', resultObj.gid)
					.html('<td><h4>' + resultObj.name + '</h4></td>' +
						'<td>' +
						'<div class="btn-group pull-right">' +
						'<button type="button" data-gpriv="g+r" class="btn btn-default' + (resultObj.privileges['g+r'] ? ' active' : '') + '">Read</button>' +
						'<button type="button" data-gpriv="g+w" class="btn btn-default' + (resultObj.privileges['g+w'] ? ' active' : '') + '">Write</button>' +
						'</div>' +
						'</td>');
				groupsResultsEl.append(trEl);
			}
		});

		groupsResultsEl.off().on('click', '[data-gpriv]', function(e) {
			var	btnEl = $(this),
				gid = btnEl.parents('tr[data-gid]').attr('data-gid'),
				privilege = btnEl.attr('data-gpriv');
			e.preventDefault();

			socket.emit('admin.categories.setGroupPrivilege', {
				cid: cid,
				gid: gid,
				privilege: privilege,
				set: !btnEl.hasClass('active')
			}, function(err) {
				if (!err) {
					btnEl.toggleClass('active');
				}
			});
		});

		modal.modal();
	};

	Categories.refreshPrivilegeList = function (cid) {
		var	modalEl = $('#category-permissions-modal'),
			readMembers = modalEl.find('#category-permissions-read'),
			writeMembers = modalEl.find('#category-permissions-write'),
			moderatorsEl = modalEl.find('#category-permissions-mods');
		socket.emit('admin.categories.getPrivilegeSettings', cid, function(err, privilegeList) {
			var	readLength = privilegeList['+r'].length,
				writeLength = privilegeList['+w'].length,
				modLength = privilegeList['mods'].length,
				liEl, x, userObj;

			if (readLength > 0) {
				for(x = 0; x < readLength; x++) {
					userObj = privilegeList['+r'][x];
					liEl = $('<li/>').attr('data-uid', userObj.uid).html('<img src="' + userObj.picture + '" title="' + userObj.username + '" />');
					readMembers.append(liEl);
				}
			} else {
				liEl = $('<li/>').addClass('empty').html('All users can read and see this category');
				readMembers.append(liEl);
			}

			if (writeLength > 0) {
				for(x=0;x<writeLength;x++) {
					userObj = privilegeList['+w'][x];
					$('<li />').attr('data-uid', userObj.uid).html('<img src="' + userObj.picture + '" title="' + userObj.username + '" />');
					writeMembers.append(liEl);
				}
			} else {
				liEl = $('<li />').addClass('empty').html('All users can write to this category');
				writeMembers.append(liEl);
			}

			if (modLength > 0) {
				for(x = 0;x < modLength; x++) {
					userObj = privilegeList['mods'][x];
					liEl = $('<li />').attr('data-uid', userObj.uid).html('<img src="' + userObj.picture + '" title="' + userObj.username + '" />');
					moderatorsEl.append(liEl);
				}
			} else {
				liEl = $('<li />').addClass('empty').html('No moderators');
				moderatorsEl.appendChild(liEl);
			}
		});
	};

	return Categories;
});
