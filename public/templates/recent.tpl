<ol class="breadcrumb">
	<li><a href="/">Home</a></li>
	<li class="active">{category_name}</li>
	<div id="category_active_users"></div>
</ol>

<ul class="nav nav-pills">
	<li class=''><a href='/recent/day'>[[recent:day]]</a></li>
	<li class=''><a href='/recent/week'>[[recent:week]]</a></li>
	<li class=''><a href='/recent/month'>[[recent:month]]</a></li>
</ul>

<br />

<a href="/recent">
	<div class="alert alert-warning hide" id="new-topics-alert"></div>
</a>

<div class="alert alert-warning hide {no_topics_message}" id="category-no-topics">
	<strong>There are no recent topics.</strong>
</div>

<div class="category row">
	<div class="{topic_row_size}">
		<ul id="topics-container">
		<!-- BEGIN topics -->
		<a href="../../topic/{topics.slug}" id="tid-{topics.tid}">
			<li class="category-item {topics.deleted-class}">
				<div class="row">
					<div class="col-md-12 col-xs-12 topic-row img-thumbnail">

						<a href="../../topic/{topics.slug}">
							<h3><span class="topic-title"><strong><i class="{topics.pin-icon}"></i> <i class="{topics.lock-icon}"></i></strong> {topics.title}</span></h3>
						</a>
						<small>
							<span class="topic-stats">
								<span class="badge {topics.badgeclass}">{topics.postcount}</span> posts
							</span>
							<span class="topic-stats">
								<span class="badge {topics.badgeclass}">{topics.viewcount}</span> views
							</span>

							<span class="pull-right hidden-xs">
								<a href="/user/{topics.userslug}">
									<img class="img-rounded teaser-pic" src="{topics.picture}" title="{topics.username}"/>
								</a>

								<a href="../../topic/{topics.slug}">
									<span>
										posted <span class="timeago" title="{topics.relativeTime}"></span>
									</span>
								</a>
								|
								<a href="/user/{topics.teaser_userslug}">
									<img class="img-rounded teaser-pic" src="{topics.teaser_userpicture}" title="{topics.teaser_username}"/>
								</a>
								<a href="../../topic/{topics.slug}#{topics.teaser_pid}">
									<span>
									 	replied <span class="timeago" title="{topics.teaser_timestamp}"></span>
									</span>
								</a>
							</span>
						</small>


					</div>
				</div>
			</li>
		</a>
		<!-- END topics -->
		</ul>
	</div>
</div>
