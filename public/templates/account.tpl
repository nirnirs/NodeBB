
<div class="well account">

	<div class="account-username-box" data-userslug="{userslug}">
		<span class="account-username">
			<a href="{relative_path}/user/{userslug}">{username}</a>
		</span>
	</div>

	<div class="row">
		<div class="col-md-2 account-block" style="text-align: center; margin-bottom:20px;">
			<div class="account-picture-block">
				<img src="{picture}" class="user-profile-picture img-thumbnail"/>
			</div>
			<div class="account-online-status">
				<span><i class="fa fa-circle status offline"></i> <span>[[user:offline]]</span></span>
			</div>
			<!-- IF banned -->
			<div>
				<span class="label label-danger">[[user:banned]]</span>
			</div>
			<!-- ENDIF banned -->
			<div>
				<a id="chat-btn" href="#" class="btn btn-default hide">Chat</a>
			</div>
			<div id="user-actions">
				<a id="follow-btn" href="#" class="btn btn-default hide">Follow</a>
				<a id="unfollow-btn" href="#" class="btn btn-default hide">Unfollow</a>
			</div>
		</div>

		<div class="col-md-4">
			<div class="inline-block">
				<div class="account-bio-block">
					<span class="account-bio-label">[[user:email]]</span><i class="fa fa-eye-slash {emailClass}" title="[[user:email_hidden]]"></i>
					<!-- IF email -->
					<span>{email}</span>
					<!-- ELSE -->
					<i class="fa fa-eye-slash" title="[[user:email_hidden]]"></i> [[user:hidden]]
					<!-- ENDIF email -->
					<br/>


					<!-- IF fullname -->
					<span class="account-bio-label">[[user:fullname]]</span>
					<span>{fullname}</span>
					<br/>
					<!-- ENDIF fullname -->

					<!-- IF website -->
					<span class="account-bio-label">[[user:website]]</span>
					<span><a href="{website}">{websiteName}</a></span>
					<br/>
					<!-- ENDIF website -->

					<!-- IF location -->
					<span class="account-bio-label">[[user:location]]</span>
					<span>{location}</span>
					<br/>
					<!-- ENDIF location -->

					<!-- IF age -->
					<span class="account-bio-label">[[user:age]]</span>
					<span>{age}</span>
					<br/>
					<!-- ENDIF age -->

					<hr/>
					<span class="account-bio-label">[[user:joined]]</span>
					<span class="timeago" title="{joindate}"></span>
					<br/>

					<span class="account-bio-label">[[user:lastonline]]</span>
					<span class="timeago" title="{lastonline}"></span>
					<br/>

					<span class="account-bio-label">[[user:profile_views]]</span>
					<span class="formatted-number">{profileviews}</span>
					<br/>

					<span class="account-bio-label">[[user:reputation]]</span>
					<span class="formatted-number">{reputation}</span>
					<br/>

					<span class="account-bio-label">[[user:posts]]</span>
					<span class="formatted-number">{postcount}</span>
					<br/>

					<span class="account-bio-label">[[user:followers]]</span>
					<span class="formatted-number">{followerCount}</span>
					<br/>

					<span class="account-bio-label">[[user:following]]</span>
					<span class="formatted-number">{followingCount}</span>
					<br/>

					<hr/>
					<!-- IF !disableSignatures -->
					<!-- IF signature -->
					<span class="account-bio-label">[[user:signature]]</span>
					<div class="post-signature">
						<span id='signature'>{signature}</span>
					</div>
					<!-- ENDIF signature -->
					<!-- ENDIF !disableSignatures -->
				</div>
			</div>
		</div>

		<div class="col-md-6 user-recent-posts">
			<div class="topic-row panel panel-default clearfix">
				<div class="panel-heading">
					<h3 class="panel-title">[[global:recentposts]]</h3>
				</div>
				<div class="panel-body">
					<!-- BEGIN posts -->
					<div class="clearfix">
						<p>{posts.content}</p>
						<small>
							<span class="pull-right">
								<a href="../../topic/{posts.tid}/#{posts.pid}">[[global:posted]]</a>
								[[global:in]]
								<a href="../../category/{posts.categorySlug}">
									<i class="fa {posts.categoryIcon}"></i> {posts.categoryName}
								</a>
								<span class="timeago" title="{posts.relativeTime}"></span>
							</span>
						</small>
					</div>
					<hr/>
					<!-- END posts -->
				</div>
			</div>

		</div>
	</div>

	<br/>
	<div id="user-action-alert" class="alert alert-success hide"></div>

</div>

<input type="hidden" template-variable="yourid" value="{yourid}" />
<input type="hidden" template-variable="theirid" value="{theirid}" />
<input type="hidden" template-type="boolean" template-variable="isFollowing" value="{isFollowing}" />
