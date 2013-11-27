<h1>Users</h1>
<hr />
<ul class="nav nav-pills">
	<li class='active'><a href='/admin/users/latest'>Latest Users</a></li>
	<li class=''><a href='/admin/users/sort-posts'>Top Posters</a></li>
	<li class=''><a href='/admin/users/sort-reputation'>Most Reputation</a></li>
	<li class=''><a href='/admin/users/search'>Search</a></li>
</ul>

<br />
<div class="search {search_display} well">
	<input class="form-control" id="search-user" type="text" placeholder="Enter a username to search"/><br />
	<i class="fa fa-spinner fa-spin none"></i>
	<span id="user-notfound-notify" class="label label-danger hide">User not found!</span><br/>
</div>

<ul id="users-container" class="users admin">
	<!-- BEGIN users -->
	<div class="users-box" data-uid="{users.uid}" data-admin="{users.administrator}" data-username="{users.username}" data-banned="{users.banned}">
		<a href="/user/{users.userslug}">
			<img src="{users.picture}" class="img-thumbnail"/>
		</a>
		<br/>
		<a href="/user/{users.userslug}">{users.username}</a>
		<br/>
		<div title="reputation">
			<i class='fa fa-star'></i>
			<span id='reputation'>{users.reputation}</span>
		</div>
		<div title="post count">
			<i class='fa fa-pencil'></i>
			<span id='postcount'>{users.postcount}</span>
		</div>
		<div>
			<a href="#" class="btn btn-default ban-btn">Ban</a>
		</div>
	</div>
	<!-- END users -->
</ul>

<div class="text-center {loadmore_display}">
	<button id="load-more-users-btn" class="btn btn-primary">Load More</button>
</div>
<input type="hidden" template-variable="yourid" value="{yourid}" />
