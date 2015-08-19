<nav class="header">
	<ul>
		<li>
			<a href="{relative_path}/admin/general/dashboard">Dashboard</a>
		</li>
		<li class="dropdown">
			<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">General</a>
			<ul class="dropdown-menu" role="menu">
				<li><a href="{relative_path}/admin/general/homepage">Home Page</a></li>
				<li><a href="{relative_path}/admin/general/navigation">Navigation</a></li>
				<li><a href="{relative_path}/admin/general/languages">Languages</a></li>
				<li><a href="{relative_path}/admin/general/sounds">Sounds</a></li>
			</ul>
		</li>
		<li class="dropdown">
			<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">Manage</a>
			<ul class="dropdown-menu" role="menu">
				<li><a href="{relative_path}/admin/manage/categories">Categories</a></li>
				<li><a href="{relative_path}/admin/manage/tags">Tags</a></li>
				<li><a href="{relative_path}/admin/manage/users">Users</a></li>
				<li><a href="{relative_path}/admin/manage/groups">Groups</a></li>
				<li><a href="{relative_path}/admin/manage/flags">Flags</a></li>
			</ul>
		</li>
		<li class="dropdown">
			<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">Settings</a>
			<ul class="dropdown-menu" role="menu">
				<li><a href="{relative_path}/admin/settings/general">General</a></li>
				<li><a href="{relative_path}/admin/settings/reputation">Reputation</a></li>
				<li><a href="{relative_path}/admin/settings/email">Email</a></li>
				<li><a href="{relative_path}/admin/settings/user">User</a></li>
				<li><a href="{relative_path}/admin/settings/group">Group</a></li>
				<li><a href="{relative_path}/admin/settings/guest">Guests</a></li>
				<li><a href="{relative_path}/admin/settings/post">Post</a></li>
				<li><a href="{relative_path}/admin/settings/pagination">Pagination</a></li>
				<li><a href="{relative_path}/admin/settings/tags">Tags</a></li>
				<li><a href="{relative_path}/admin/settings/notifications">Notifications</a></li>
				<li><a href="{relative_path}/admin/settings/web-crawler">Web Crawler</a></li>
				<li><a href="{relative_path}/admin/settings/sockets">Sockets</a></li>
				<li><a href="{relative_path}/admin/settings/advanced">Advanced</a></li>
			</ul>
		</li>
		<li class="dropdown">
			<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">Appearance</a>
			<ul class="dropdown-menu" role="menu">
				<li><a href="{relative_path}/admin/appearance/themes">Themes</a></li>
				<li><a href="{relative_path}/admin/appearance/skins">Skins</a></li>
				<li><a href="{relative_path}/admin/appearance/customise">Custom HTML &amp; CSS</a></li>
			</ul>
		</li>
		<li class="dropdown">
			<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">Extend</a>
			<ul class="dropdown-menu" role="menu">
				<li><a href="{relative_path}/admin/extend/plugins">Plugins</a></li>
				<li><a href="{relative_path}/admin/extend/widgets">Widgets</a></li>
				<li><a href="{relative_path}/admin/extend/rewards">Rewards</a></li>
			</ul>
		</li>
		<!-- IF authentication.length -->
		<li class="dropdown">
			<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">Social Authentication</a>
			<ul class="dropdown-menu" role="menu">
				<!-- BEGIN authentication -->
				<li>
					<a href="{relative_path}/admin{authentication.route}">{authentication.name}</a>
				</li>
				<!-- END authentication -->
			</ul>
		</li>
		<!-- ENDIF authentication.length -->
		<!-- IF plugins.length -->
		<li class="dropdown">
			<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">Plugins</a>
			<ul class="dropdown-menu" role="menu">
				<!-- BEGIN plugins -->
				<li>
					<a href="{relative_path}/admin{plugins.route}">{plugins.name}</a>
				</li>
				<!-- END plugins -->
				<li class="divider"></li>
				<li data-link="1">
					<a href="{relative_path}/admin/extend/plugins"><i class="fa fa-plus"></i> Install Plugins</a>
				</li>
			</ul>
		</li>
		<!-- ENDIF plugins.length -->
		<li class="dropdown">
			<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">Advanced</a>
			<ul class="dropdown-menu" role="menu">
				<li><a href="{relative_path}/admin/advanced/database">Database</a></li>
				<li><a href="{relative_path}/admin/advanced/events">Events</a></li>
				<li><a href="{relative_path}/admin/advanced/logs">Logs</a></li>
				<li><a href="{relative_path}/admin/advanced/post-cache">Post Cache</a></li>
				<!-- IF env -->
				<li><a href="{relative_path}/admin/development/logger">Logger</a></li>
				<!-- ENDIF env -->
			</ul>
		</li>
	</ul>
</nav>