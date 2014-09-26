<div class="languages">
	<div class="col-sm-9">
		<div class="panel panel-default">
			<div class="panel-heading">Languages</div>
			<div class="panel-body">
				<p>
					The default language determines the language settings for all users who
					are visiting your forum. <br />
					Individual users can override the default language on their account settings page.
				</p>

				<form class="row">
					<div class="form-group col-sm-6">
						<label for="defaultLang">Default Language</label>
						<select id="language" data-field="defaultLang" class="form-control">
							<!-- BEGIN languages -->
							<option value="{languages.code}">{languages.name} ({languages.code})</option>
							<!-- END languages -->
						</select>
					</div>
				</form>

				<button class="btn btn-primary" id="save">Save</button>
			</div>
		</div>
	</div>
</div>

<script type="text/javascript">
$('#language').val(translator.getLanguage());
</script>