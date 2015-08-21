<!-- IMPORT admin/settings/header.tpl -->

<div class="row">
	<div class="col-xs-2 settings-header">Tag Settings</div>
	<div class="col-xs-10">
		<form>
			<div class="checkbox">
				<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input class="mdl-switch__input" type="checkbox" data-field="privateTagListing">
					<span class="mdl-switch__label">Make the tags list private</span>
				</label>
			</div>
			<div class="form-group">
				<label for="minimumTagsPerTopics">Minimum Tags per Topic</label>
				<input id="minimumTagsPerTopics" type="text" class="form-control" value="0" data-field="minimumTagsPerTopic">
			</div>
			<div class="form-group">
				<label for="maximumTagsPerTopics">Maximum Tags per Topic</label>
				<input id="maximumTagsPerTopics" type="text" class="form-control" value="5" data-field="maximumTagsPerTopic">
			</div>
			<div class="form-group">
				<label for="minimumTagLength">Minimum Tag Length</label>
				<input id="minimumTagLength" type="text" class="form-control" value="3" data-field="minimumTagLength">
			</div>
			<div class="form-group">
				<label for="maximumTagLength">Maximum Tag Length</label>
				<input id="maximumTagLength" type="text" class="form-control" value="15" data-field="maximumTagLength">
			</div>
		</form>
		Click <a href="/admin/manage/tags">here</a> to visit the tag management page.
	</div>
</div>

<!-- IMPORT admin/settings/footer.tpl -->