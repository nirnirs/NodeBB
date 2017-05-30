'use strict';


define('forum/topic/move', function () {
	var Move = {};
	var modal;
	var selectedCategory;

	Move.init = function (tids, currentCid, onComplete) {
		Move.tids = tids;
		Move.currentCid = currentCid;
		Move.onComplete = onComplete;
		Move.moveAll = !tids;

		socket.emit('categories.getMoveCategories', onCategoriesLoaded);
	};

	function onCategoriesLoaded(err, categories) {
		if (err) {
			return app.alertError(err.message);
		}

		parseModal(categories, function () {
			modal.on('hidden.bs.modal', function () {
				modal.remove();
			});

			modal.find('#move-confirm').addClass('hide');

			if (Move.moveAll || (Move.tids && Move.tids.length > 1)) {
				modal.find('.modal-header h3').translateText('[[topic:move_topics]]');
			}

			modal.find('#select-cid').on('change', function () {
				var cid = $(this).val();
				var optionEl = $(this).find('option[value="' + cid + '"]');

				var selectedCategory = {
					cid: cid,
					name: optionEl.attr('data-name'),
					text: optionEl.text(),
					icon: optionEl.attr('data-icon'),
				};
				selectCategory(selectedCategory);
			});

			modal.find('#move_thread_commit').on('click', onCommitClicked);

			modal.modal('show');
		});
	}

	function parseModal(categories, callback) {
		app.parseAndTranslate('partials/move_thread_modal', { categories: categories }, function (html) {
			modal = $(html);

			callback();
		});
	}

	function selectCategory(category) {
		modal.find('#confirm-category-name').text(category.name);
		modal.find('#move-confirm').removeClass('hide');

		selectedCategory = category;
		modal.find('#move_thread_commit').prop('disabled', false);
	}

	function onCommitClicked() {
		var commitEl = modal.find('#move_thread_commit');

		if (!commitEl.prop('disabled') && selectedCategory && selectedCategory.cid) {
			commitEl.prop('disabled', true);

			moveTopics();
		}
	}

	function moveTopics() {
		socket.emit(Move.moveAll ? 'topics.moveAll' : 'topics.move', {
			tids: Move.tids,
			cid: selectedCategory.cid,
			currentCid: Move.currentCid,
		}, function (err) {
			modal.modal('hide');

			if (err) {
				return app.alertError(err.message);
			}

			app.alertSuccess('[[topic:topic_move_success, ' + selectedCategory.name + ']] <i class="fa fa-fw ' + selectedCategory.icon + '"></i>');
			if (typeof Move.onComplete === 'function') {
				Move.onComplete();
			}
		});
	}


	return Move;
});
