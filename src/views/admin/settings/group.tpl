<!-- IMPORT admin/settings/header.tpl -->

<div class="row">
	<div class="col-xs-2 settings-header">General</div>
	<div class="col-xs-10">
		<form role="form">
			<div class="checkbox">
				<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input class="mdl-switch__input" type="checkbox" data-field="allowPrivateGroups" checked>
					<span class="mdl-switch__label"><strong>Private Groups</strong></span>
				</label>
			</div>

			<p class="help-block">
				If enabled, joining of groups requires the approval of the group owner <em>(Default: enabled)</em>
			</p>
			<p class="help-block">
				<strong>Beware!</strong> If this option is disabled and you have private groups, they automatically become public.
			</p>

			<div class="checkbox">
				<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect">
					<input class="mdl-switch__input" type="checkbox" data-field="allowGroupCreation">
					<span class="mdl-switch__label"><strong>Allow Group Creation</strong></span>
				</label>
			</div>

			<p class="help-block">
				If enabled, users can create groups <em>(Default: disabled)</em>
			</p>
		</form>
	</div>
</div>

<!-- IMPORT admin/settings/footer.tpl -->