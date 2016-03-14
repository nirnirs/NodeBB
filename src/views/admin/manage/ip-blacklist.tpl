<div class="flags">
	<div class="col-lg-12">
		<p class="lead">
			Configure your IP blacklist here.
		</p>
		<p>
			Occasionally, a user account ban is not enough of a deterrant. Other times, restricting access to the forum to a specific IP or a range of IPs
			is the best way to protect a forum. In these scenarios, you can add troublesome IP addresses or entire CIDR blocks to this blacklist, and
			they will be prevented from logging in to or registering a new account.
		</p>

		<div class="row">
			<div class="col-sm-6">
				<div id="blacklist-rules"></div>
				<form class="blacklist-settings">
					<input type="hidden" id="blacklist-rules-holder" value="" name="rules" />
				</form>
			</div>
			<div class="col-sm-6">
				<div class="panel panel-default">
					<div class="panel-heading">Active Rules</div>
					<div class="panel-body">
						<button type="button" class="btn btn-warning" data-action="test"><i class="fa fa-bomb"></i> Validate Blacklist</button>
						<button type="button" class="btn btn-primary" data-action="apply"><i class="fa fa-save"></i> Apply Blacklist</button>
					</div>
				</div>
			</div>
		</div>
	</div>

</div>