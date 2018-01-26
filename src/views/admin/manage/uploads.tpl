<!-- IMPORT partials/breadcrumbs.tpl -->
<div class="clearfix">
	<button id="upload" class="btn-success pull-right"><i class="fa fa-upload"></i> [[global:upload]]</button>
</div>

<div class="table-responsive">
	<table class="table table-striped users-table">
		<thead>
			<tr>
				<th>[[admin/manage/uploads:filename]]</th>
				<th class="text-right">[[admin/manage/uploads:size/filecount]]</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			<!-- BEGIN files -->
			<tr data-path="{files.path}">
				<!-- IF files.isDirectory -->
				<td class="col-md-9" role="button">
					<i class="fa fa-fw fa-folder-o"></i> <a href="{config.relative}/admin/manage/uploads?dir={files.path}">{files.name}</a>
				</td>
				<!-- ENDIF files.isDirectory -->

				<!-- IF files.isFile -->
				<td class="col-md-9">
					<i class="fa fa-fw fa-file-text-o"></i> <a href="{config.relative_path}{files.url}" target="_blank">{files.name}</a>
				</td>
				<!-- ENDIF files.isFile -->

				<td class="col-md-2 text-right"><!-- IF files.size -->{files.sizeHumanReadable}<!-- ELSE -->[[admin/manage/uploads:filecount, {files.fileCount}]]<!-- ENDIF files.size --></td>

				<td role="button" class="col-md-1 text-right"><i class="delete fa fa-fw fa-trash-o <!-- IF !files.isFile --> hidden<!-- ENDIF !files.isFile -->"></i></td>
			</tr>
			<!-- END files -->
		</tbody>
	</table>
</div>

<!-- IMPORT partials/paginator.tpl -->