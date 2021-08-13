'use strict';


define('flags', ['hooks', 'components', 'api'], function (hooks, components, api) {
	var Flag = {};
	var flagModal;
	var flagCommit;
	var flagReason;

	Flag.showFlagModal = function (data) {
		app.parseAndTranslate('partials/modals/flag_modal', data, function (html) {
			flagModal = html;
			flagModal.on('hidden.bs.modal', function () {
				flagModal.remove();
			});

			flagCommit = flagModal.find('#flag-post-commit');
			flagReason = flagModal.find('#flag-reason-custom');

			// Quick-report buttons
			flagModal.on('click', '.flag-reason', function () {
				var reportText = $(this).text();

				if (flagReason.val().length === 0) {
					return createFlag(data.type, data.id, reportText);
				}

				// Custom reason has text, confirm submission
				bootbox.confirm({
					title: '[[flags:modal-submit-confirm]]',
					message: '<p>[[flags:modal-submit-confirm-text]]</p><p class="help-block">[[flags:modal-submit-confirm-text-help]]</p>',
					callback: function (result) {
						if (result) {
							createFlag(data.type, data.id, reportText);
						}
					},
				});
			});

			// Custom reason report submission
			flagCommit.on('click', function () {
				createFlag(data.type, data.id, flagModal.find('#flag-reason-custom').val());
			});

			flagModal.on('click', '.toggle-custom', function () {
				flagReason.prop('disabled', false);
				flagReason.focus();
			});

			flagModal.modal('show');
			hooks.fire('action:flag.showModal', {
				modalEl: flagModal,
				type: data.type,
				id: data.id,
			});

			flagModal.find('#flag-reason-custom').on('keyup blur change', checkFlagButtonEnable);
		});
	};

	Flag.resolve = function (flagId) {
		api.put(`/flags/${flagId}`, {
			state: 'resolved',
		}).then(() => {
			app.alertSuccess('[[flags:resolved]]');
			hooks.fire('action:flag.resolved', { flagId: flagId });
		}).catch(app.alertError);
	};

	function createFlag(type, id, reason) {
		if (!type || !id || !reason) {
			return;
		}
		var data = { type: type, id: id, reason: reason };
		api.post('/flags', data, function (err, flagId) {
			if (err) {
				return app.alertError(err.message);
			}

			flagModal.modal('hide');
			app.alertSuccess('[[flags:modal-submit-success]]');
			if (type === 'post') {
				var postEl = components.get('post', 'pid', id);
				postEl.find('[component="post/flag"]').addClass('hidden').parent().attr('hidden', '');
				postEl.find('[component="post/already-flagged"]').removeClass('hidden').parent().attr('hidden', null);
			}
			hooks.fire('action:flag.create', { flagId: flagId, data: data });
		});
	}

	function checkFlagButtonEnable() {
		if (flagModal.find('#flag-reason-custom').val()) {
			flagCommit.removeAttr('disabled');
		} else {
			flagCommit.attr('disabled', true);
		}
	}

	return Flag;
});
