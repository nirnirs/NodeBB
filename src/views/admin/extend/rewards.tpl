<div id="rewards">
	<div class="col-lg-9">
		<div class="panel panel-default">
			<div class="panel-heading">Rewards</div>
			<div class="panel-body">
				<form>
					<ul id="active">
						<!-- BEGIN active -->
						<li data-id="{active.id}" data-index="@index">
							<div class="well inline-block">
								<label for="condition">If User's</label><br />
								<select name="condition" data-selected="{active.condition}">
									<!-- BEGIN conditions -->
									<option value="{conditions.condition}">{conditions.name}</option>
									<!-- END conditions -->
								</select>
							</div>
							<div class="well inline-block">
								<label for="condition">Is:</label><br />
								<select name="conditional" data-selected="{active.conditional}">
									<!-- BEGIN conditionals -->
									<option value="{conditionals.conditional}">{conditionals.name}</option>
									<!-- END conditionals -->
								</select>
								<input type="text" value="{active.value}" />
							</div>
							<div class="well inline-block">
								<label for="condition">Then:</label><br />
								<select name="reward" data-selected="{active.id}">
									<!-- BEGIN rewards -->
									<option value="{rewards.id}">{rewards.name}</option>
									<!-- END rewards -->
								</select>
							</div>
							<div class="inputs well inline-block"></div>
							<div class="well inline-block pull-right">
								<button class="btn btn-danger delete">Delete</button>
								<!-- IF active.disabled -->
								<button class="btn btn-success toggle">Enable</button>
								<!-- ELSE -->
								<button class="btn btn-warning toggle">Disable</button>
								<!-- ENDIF active.disabled -->
							</div>
							<div class="clearfix"></div>
						</li>
						<!-- END active -->
					</ul>
				</form>
				<input type="hidden" template-variable="rewards" value="{function.stringify, rewards}" />
				<input type="hidden" template-variable="active" value="{function.stringify, active}" />
			</div>
		</div>
	</div>

	<div class="col-lg-3 acp-sidebar">
		<div class="panel panel-default">
			<div class="panel-heading">Rewards Control</div>
			<div class="panel-body">
				<button class="btn btn-success btn-md" id="new">New Reward</button>
				<button class="btn btn-primary btn-md" id="save">Save Changes</button>
			</div>
		</div>
	</div>
</div>