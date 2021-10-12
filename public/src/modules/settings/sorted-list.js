'use strict';

define('settings/sorted-list', [
	'benchpress',
	'bootbox',
	'hooks',
	'jquery-ui/widgets/sortable',
], function (benchpress, bootbox, hooks) {
	let Settings;


	const SortedList = {
		types: ['sorted-list'],
		use: function () {
			Settings = this;
		},
		set: function ($container, values) {
			const key = $container.attr('data-sorted-list');

			values[key] = [];
			$container.find('[data-type="item"]').each(function (idx, item) {
				const itemUUID = $(item).attr('data-sorted-list-uuid');

				const formData = Settings.helper.serializeForm($('[data-sorted-list-object="' + key + '"][data-sorted-list-uuid="' + itemUUID + '"]'));
				stripTags(formData);
				values[key].push(formData);
			});
		},
		get: function ($container, hash) {
			const $list = $container.find('[data-type="list"]');
			const key = $container.attr('data-sorted-list');
			const formTpl = $container.attr('data-form-template');

			benchpress.render(formTpl, {}).then(function (formHtml) {
				const addBtn = $('[data-sorted-list="' + key + '"] [data-type="add"]');

				addBtn.on('click', function () {
					const modal = bootbox.confirm(formHtml, function (save) {
						if (save) {
							SortedList.addItem(modal.find('form').children(), $container);
						}
					});
				});

				const call = $container.parents('form').attr('data-socket-get');
				const list = ajaxify.data[call ? hash : 'settings'][key];

				if (Array.isArray(list) && typeof list[0] !== 'string') {
					list.forEach(function (item) {
						const itemUUID = utils.generateUUID();
						const form = $(formHtml).deserialize(item);
						form.attr('data-sorted-list-uuid', itemUUID);
						form.attr('data-sorted-list-object', key);
						$('#content').append(form.hide());

						parse($container, itemUUID, item).then(() => {
							hooks.fire('action:settings.sorted-list.loaded', { element: $list.get(0) });
						});
					});
				}
			});

			$list.sortable().addClass('pointer');
		},
		addItem: function ($formElements, $target) {
			const key = $target.attr('data-sorted-list');
			const itemUUID = utils.generateUUID();
			const form = $('<form class="" data-sorted-list-uuid="' + itemUUID + '" data-sorted-list-object="' + key + '"></form>');
			form.append($formElements);

			$('#content').append(form.hide());

			const data = Settings.helper.serializeForm(form);
			parse($target, itemUUID, data);
		},
	};

	function setupRemoveButton($container, itemUUID) {
		const removeBtn = $container.find('[data-sorted-list-uuid="' + itemUUID + '"] [data-type="remove"]');
		removeBtn.on('click', function () {
			$('[data-sorted-list-uuid="' + itemUUID + '"]').remove();
		});
	}

	function setupEditButton($container, itemUUID) {
		const $list = $container.find('[data-type="list"]');
		const key = $container.attr('data-sorted-list');
		const itemTpl = $container.attr('data-item-template');
		const editBtn = $('[data-sorted-list-uuid="' + itemUUID + '"] [data-type="edit"]');

		editBtn.on('click', function () {
			const form = $('[data-sorted-list-uuid="' + itemUUID + '"][data-sorted-list-object="' + key + '"]').clone(true).show();

			const modal = bootbox.confirm(form, function (save) {
				if (save) {
					const form = $('<form class="" data-sorted-list-uuid="' + itemUUID + '" data-sorted-list-object="' + key + '"></form>');
					form.append(modal.find('form').children());

					$('#content').find('[data-sorted-list-uuid="' + itemUUID + '"][data-sorted-list-object="' + key + '"]').remove();
					$('#content').append(form.hide());


					const data = Settings.helper.serializeForm(form);
					stripTags(data);

					app.parseAndTranslate(itemTpl, data, function (itemHtml) {
						itemHtml = $(itemHtml);
						const oldItem = $list.find('[data-sorted-list-uuid="' + itemUUID + '"]');
						oldItem.after(itemHtml);
						oldItem.remove();
						itemHtml.attr('data-sorted-list-uuid', itemUUID);

						setupRemoveButton($container, itemUUID);
						setupEditButton($container, itemUUID);
					});
				}
			});
		});
	}

	function parse($container, itemUUID, data) {
		const $list = $container.find('[data-type="list"]');
		const itemTpl = $container.attr('data-item-template');

		stripTags(data);

		return new Promise((resolve) => {
			app.parseAndTranslate(itemTpl, data, function (itemHtml) {
				itemHtml = $(itemHtml);
				$list.append(itemHtml);
				itemHtml.attr('data-sorted-list-uuid', itemUUID);

				setupRemoveButton($container, itemUUID);
				setupEditButton($container, itemUUID);
				resolve();
			});
		});
	}

	function stripTags(data) {
		return Object.entries(data || {}).forEach(([field, value]) => {
			data[field] = utils.stripHTMLTags(value, utils.stripTags);
		});
	}

	return SortedList;
});
