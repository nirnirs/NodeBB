<h1>Topics</h1>
<hr />

<!-- IF notopics -->
<div class="alert alert-warning" id="category-no-topics">
	<strong>There are no topics.</strong>
</div>
<!-- ENDIF notopics -->

<ul class="topics">
	<!-- BEGIN topics -->
	<li data-tid="{topics.tid}" data-locked="{topics.locked}" data-pinned="{topics.pinned}" data-deleted="{topics.deleted}">
		<div class="btn-group pull-right">
			<button data-action="pin" class="btn"><i class="icon-pushpin"></i></button>
			<button data-action="lock" class="btn"><i class="icon-lock"></i></button>
			<button data-action="delete" class="btn"><i class="icon-trash"></i></button>
		</div>
		<a target="_blank" href="{relative_path}/topic/{topics.slug}">{topics.title}</a>
		<ul>
			<li><i class="icon-time"></i> Posted <span class="timeago" title="{topics.relativeTime}"></span> by {topics.username}</li>
			<li><i class="icon-comments"></i> {topics.postcount} post(s)</li>
		</ul>
		<div class="clear"></div>
	</li>
	<!-- END topics -->
</ul>

<!-- IF showLoadMore -->
<div class="text-center">
	<button id="topics_loadmore" class="btn btn-primary btn-lg">Load More Topics</button>
</div>
<!-- ENDIF showLoadMore -->
