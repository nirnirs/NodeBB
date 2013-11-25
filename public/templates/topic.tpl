<input type="hidden" template-variable="expose_tools" value="{expose_tools}" />
<input type="hidden" template-variable="topic_id" value="{topic_id}" />
<input type="hidden" template-variable="locked" value="{locked}" />
<input type="hidden" template-variable="deleted" value="{deleted}" />
<input type="hidden" template-variable="pinned" value="{pinned}" />
<input type="hidden" template-variable="topic_name" value="{topic_name}" />
<input type="hidden" template-variable="postcount" value="{postcount}" />
<input type="hidden" template-variable="twitter-intent-url" value="{twitter-intent-url}" />
<input type="hidden" template-variable="facebook-share-url" value="{facebook-share-url}" />
<input type="hidden" template-variable="google-share-url" value="{google-share-url}" />

<div class="topic row">
	<ol class="breadcrumb">
		<li itemscope="itemscope" itemtype="http://data-vocabulary.org/Breadcrumb">
			<a href="/" itemprop="url"><span itemprop="title">[[global:home]]</span></a>
		</li>
		<li itemscope="itemscope" itemtype="http://data-vocabulary.org/Breadcrumb">
			<a href="/category/{category_slug}" itemprop="url"><span itemprop="title">{category_name}</span></a>
		</li>
		<li class="active" itemscope="itemscope" itemtype="http://data-vocabulary.org/Breadcrumb">
			<span itemprop="title">{topic_name} <a target="_blank" href="../{topic_id}.rss"><i class="icon-rss-sign"></i></a></span>
		</li>

	</ol>

	<ul id="post-container" class="container" data-tid="{topic_id}">
		<div class="posts">
		<!-- BEGIN posts -->
			<li class="row post-row infiniteloaded" data-pid="{posts.pid}" data-uid="{posts.uid}" data-username="{posts.username}" data-deleted="{posts.deleted}" itemscope itemtype="http://schema.org/Comment">
				<a id="post_anchor_{posts.pid}" name="{posts.pid}"></a>

				<meta itemprop="datePublished" content="{posts.relativeTime}">
				<meta itemprop="dateModified" content="{posts.relativeEditTime}">

				<div class="col-md-1 profile-image-block hidden-xs hidden-sm sub-post">
					<a href="/user/{posts.userslug}">
						<img src="{posts.picture}" align="left" class="img-thumbnail" itemprop="image" />
						<span class="label label-danger {posts.show_banned}">[[topic:banned]]</span>
					</a>
				</div>

				<div class="col-md-11">
					<div class="post-block">
						<a class="main-post avatar" href="/user/{posts.userslug}">
							<img itemprop="image" src="{posts.picture}" align="left" class="img-thumbnail" width=150 height=150 />
						</a>
						<h3 class="main-post">
							<p id="topic_title_{posts.pid}" class="topic-title" itemprop="name">{topic_name}</p>
						</h3>

						<div class="topic-buttons">
							<div class="btn-group">
								<button class="btn btn-sm btn-default dropdown-toggle" data-toggle="dropdown" type="button" title="Posted by {posts.username}">
									<span class="username-field" href="/user/{posts.userslug}" itemprop="author">{posts.username}&nbsp;</span>
									<span class="caret"></span>
								</button>

							    <ul class="dropdown-menu">
									<li><a href="/user/{posts.userslug}"><i class="icon-user"></i> [[topic:profile]]</a></li>
									<li><div class="chat"><i class="icon-comment"></i> [[topic:chat]]</div></li>
							    </ul>
							</div>

							<div class="btn-group">
								<button class="btn btn-sm btn-default follow main-post" type="button" title="Be notified of new replies in this topic"><i class="icon-eye-open"></i></button>
								<button class="favourite btn btn-sm btn-default {posts.fav_button_class}" type="button">
									<span class="favourite-text">[[topic:favourite]]</span>
									<span class="post_rep_{posts.pid}">{posts.post_rep} </span><i class="{posts.fav_star_class}"></i>
								</button>
							</div>
							<div class="btn-group">
								<button class="btn btn-sm btn-default quote" type="button" title="[[topic:quote]]"><i class="icon-quote-left"></i></button>
								<button class="btn btn-sm btn-primary btn post_reply" type="button">[[topic:reply]] <i class="icon-reply"></i></button>
							</div>

							<div class="btn-group pull-right post-tools">
								<button class="btn btn-sm btn-default link" type="button" title="[[topic:link]]"><i class="icon-link"></i></button>
								<button class="btn btn-sm btn-default edit {posts.display_moderator_tools}" type="button" title="[[topic:edit]]"><i class="icon-pencil"></i></button>
								<button class="btn btn-sm btn-default delete {posts.display_moderator_tools}" type="button" title="[[topic:delete]]"><i class="icon-trash"></i></button>
							</div>

							<input id="post_{posts.pid}_link" value="" class="pull-right" style="display:none;"></input>
						</div>

						<div id="content_{posts.pid}" class="post-content" itemprop="text">{posts.content}</div>
						<div class="post-signature">{posts.signature}</div>
						<div class="post-info">
							<span class="pull-left">
								{posts.additional_profile_info}
							</span>
							<span class="pull-right">
								posted <span class="relativeTimeAgo timeago" title="{posts.relativeTime}"></span>
								<span class="{posts.edited-class}">| last edited by <strong><a href="/user/{posts.editorslug}">{posts.editorname}</a></strong></span>
								<span class="timeago" title="{posts.relativeEditTime}"></span>
							</span>
							<div style="clear:both;"></div>
						</div>
					</div>
				</div>
			</li>

			<!-- IF @first -->
			<li class="well post-bar">
				<div class="inline-block">
					<small class="topic-stats">
						<span>posts</span>
						<strong><span id="topic-post-count" class="formatted-number">{postcount}</span></strong> |
						<span>views</span>
						<strong><span class="formatted-number">{viewcount}</span></strong> |
						<span>browsing</span>
					</small>
					<div class="thread_active_users active-users inline-block"></div>
				</div>
				<div class="topic-main-buttons pull-right inline-block">
					<button class="btn btn-primary post_reply" type="button">[[topic:reply]]</button>
					<div class="btn-group thread-tools hide">
						<button class="btn btn-default dropdown-toggle" data-toggle="dropdown" type="button">[[topic:thread_tools.title]] <span class="caret"></span></button>
						<ul class="dropdown-menu">
							<li><a href="#" class="pin_thread"><i class="icon-pushpin"></i> [[topic:thread_tools.pin]]</a></li>
							<li><a href="#" class="lock_thread"><i class="icon-lock"></i> [[topic:thread_tools.lock]]</a></li>
							<li class="divider"></li>
							<li><a href="#" class="move_thread"><i class="icon-move"></i> [[topic:thread_tools.move]]</a></li>
							<li class="divider"></li>
							<li><a href="#" class="delete_thread"><span class="text-error"><i class="icon-trash"></i> [[topic:thread_tools.delete]]</span></a></li>
						</ul>
					</div>
				</div>
				<div style="clear:both;"></div>
			</li>
			<!-- ENDIF @first -->
		<!-- END posts -->
		</div>
	</ul>

	<div class="well col-md-11 col-xs-12 pull-right hide">
		<div class="topic-main-buttons pull-right inline-block hide">
			<div class="loading-indicator" done="0" style="display:none;">
				Loading More Posts <i class="icon-refresh icon-spin"></i>
			</div>
			<button class="btn btn-primary post_reply" type="button">[[topic:reply]]</button>
			<div class="btn-group thread-tools hide">
				<button class="btn btn-default dropdown-toggle" data-toggle="dropdown" type="button">[[topic:thread_tools.title]] <span class="caret"></span></button>
				<ul class="dropdown-menu">
					<li><a href="#" class="pin_thread"><i class="icon-pushpin"></i> [[topic:thread_tools.pin]]</a></li>
					<li><a href="#" class="lock_thread"><i class="icon-lock"></i> [[topic:thread_tools.lock]]</a></li>
					<li class="divider"></li>
					<li><a href="#" class="move_thread"><i class="icon-move"></i> [[topic:thread_tools.move]]</a></li>
					<li class="divider"></li>
					<li><a href="#" class="delete_thread"><span class="text-error"><i class="icon-trash"></i> [[topic:thread_tools.delete]]</span></a></li>
				</ul>
			</div>
		</div>
		<div style="clear:both;"></div>
	</div>

	<div class="mobile-author-overlay">
		<div class="row">
			<div class="col-xs-3">
				<img id="mobile-author-image" src="" width=50 height=50 />
			</div>
			<div class="col-xs-9">
				<h4><div id="mobile-author-overlay"></div></h4>
			</div>
		</div>
	</div>

	<div id="move_thread_modal" class="modal" tabindex="-1" role="dialog" aria-labelledby="Move Topic" aria-hidden="true">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
					<h3>Move Topic</h3>
				</div>
				<div class="modal-body">
					<p id="categories-loading"><i class="icon-spin icon-refresh"></i> [[topic:load_categories]]</p>
					<ul class="category-list"></ul>
					<p>
						[[topic:disabled_categories_note]]
					</p>
					<div id="move-confirm" style="display: none;">
						<hr />
						<div class="alert alert-info">This topic will be moved to the category <strong><span id="confirm-category-name"></span></strong></div>
					</div>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-dismiss="modal" id="move_thread_cancel">[[global:buttons.close]]</button>
					<button type="button" class="btn btn-primary" id="move_thread_commit" disabled>[[topic:confirm_move]]</button>
				</div>
			</div>
		</div>
	</div>

</div>
