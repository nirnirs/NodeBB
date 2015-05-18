<div class="plugins">
	<div class="col-lg-9">
		<div class="panel panel-default">
			<div class="panel-heading"><i class="fa fa-code-fork"></i> Installed Plugins</div>
			<div class="panel-body">
				<ul>
					<!-- BEGIN plugins -->
					<!-- IF plugins.installed -->
					<!-- IF !plugins.error -->
					<li data-plugin-id="{plugins.id}" data-version="{plugins.version}" class="clearfix">
						<div class="pull-right">
							<!-- IF plugins.isTheme -->
							<a href="{config.relative_path}/admin/appearance/themes" class="btn btn-info">Themes</a>
							<!-- ELSE -->
							<button data-action="toggleActive" class="btn <!-- IF plugins.active --> btn-warning<!-- ELSE --> btn-success<!-- ENDIF plugins.active -->"><i class="fa fa-power-off"></i> <!-- IF plugins.active -->Deactivate<!-- ELSE -->Activate<!-- ENDIF plugins.active --></button>
							<!-- ENDIF plugins.isTheme -->

							<button data-action="toggleInstall" data-installed="1" class="btn btn-danger"><i class="fa fa-trash-o"></i> Uninstall</button>
						</div>

						<h2><strong>{plugins.name}</strong></h2>

						<!-- IF plugins.description -->
						<p>{plugins.description}</p>
						<!-- ENDIF plugins.description -->
						<!-- IF plugins.outdated --><i class="fa fa-exclamation-triangle text-danger"></i> <!-- ENDIF plugins.outdated --><small>Installed <strong class="currentVersion">{plugins.version}</strong> | Latest <strong class="latestVersion">{plugins.latest}</strong></small>
						<!-- IF plugins.outdated -->
							<button data-action="upgrade" class="btn btn-success btn-xs"><i class="fa fa-download"></i> Upgrade</button>
						<!-- ENDIF plugins.outdated -->
						<!-- IF plugins.url -->
						<p>For more information: <a target="_blank" href="{plugins.url}">{plugins.url}</a></p>
						<!-- ENDIF plugins.url -->
					</li>
					<!-- ENDIF !plugins.error -->
					<!-- IF plugins.error -->
					<li data-plugin-id="{plugins.id}" class="clearfix">
						<div class="pull-right">
							<button class="btn btn-default disabled"><i class="fa fa-exclamation-triangle"></i> Unknown</button>

							<button data-action="toggleInstall" data-installed="1" class="btn btn-danger"><i class="fa fa-trash-o"></i> Uninstall</button>
						</div>

						<h2><strong>{plugins.id}</strong></h2>
						<p>
							The state of this plugin could not be determined, possibly due to a misconfiguration error.
						</p>
					</li>
					<!-- ENDIF plugins.error -->
					<!-- ENDIF plugins.installed -->
					<!-- END plugins -->
				</ul>
			</div>
		</div>

		<div class="panel panel-default">
			<div class="panel-heading"><i class="fa fa-code-fork"></i> Download Plugins</div>
			<div class="panel-body">
				<ul>
					<!-- BEGIN plugins -->
					<!-- IF !plugins.installed -->
					<li data-plugin-id="{plugins.id}" class="clearfix">
						<div class="pull-right">
							<button data-action="toggleActive" class="btn btn-success hidden"><i class="fa fa-power-off"></i> Activate</button>
							<button data-action="toggleInstall" data-installed="0" class="btn btn-success"><i class="fa fa-download"></i> Install</button>
						</div>

						<h2><strong>{plugins.name}</strong></h2>

						<!-- IF plugins.description -->
						<p>{plugins.description}</p>
						<!-- ENDIF plugins.description -->

						<small>Latest <strong class="latestVersion">{plugins.latest}</strong></small>

						<!-- IF plugins.url -->
						<p>For more information: <a target="_blank" href="{plugins.url}">{plugins.url}</a></p>
						<!-- ENDIF plugins.url -->
					</li>
					<!-- ENDIF !plugins.installed -->
					<!-- END plugins -->
				</ul>
			</div>
		</div>
	</div>

	<div class="col-lg-3 acp-sidebar">
		<div class="panel panel-default">
			<div class="panel-heading">Plugin Search</div>
			<div class="panel-body">
				<input class="form-control" type="text" id="plugin-search" placeholder="Search for plugin..."/><br/>
			</div>
		</div>

		<div class="panel panel-default">
			<div class="panel-heading">Re-order Plugins</div>
			<div class="panel-body">
				<button class="btn btn-default btn-block" id="plugin-order"><i class="fa fa-exchange"></i> Order Active Plugins</button>
				<p class="help-block">
					Certain plugins work ideally when they are initialised before/after other plugins. You can alter this loading behaviour here.
				</p>
			</div>
		</div>

		<div class="panel panel-default">
			<div class="panel-heading">Interested in writing plugins for NodeBB?</div>
			<div class="panel-body">
				<p>
					Full documentation regarding plugin authoring can be found in the <a target="_blank" href="https://docs.nodebb.org/en/latest/plugins/create.html">NodeBB Docs Portal</a>.
				</p>
			</div>
		</div>
	</div>


	<div class="modal fade" id="order-active-plugins-modal">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
					<h4 class="modal-title">Order Active Plugins</h4>
				</div>
				<div class="modal-body">
					<p>Plugins load in the order specified here, from top to bottom</p>
					<ul class="plugin-list">

					</ul>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
					<button type="button" class="btn btn-primary" id="save-plugin-order">Save</button>
				</div>
			</div>
		</div>
	</div>


</div>


