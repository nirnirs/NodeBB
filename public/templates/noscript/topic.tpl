		<div class="alert alert-error">
			<p>
				Your browser does not seem to support javascript. As a result, your viewing experience will be diminished.
			</p>
			<p>
				Please download a browser that supports javascript, or enable it, if it disabled (i.e. NoScript).
			</p>
		</div>
		<ul class="posts">
			<!-- BEGIN main_posts -->
			<li>
				<div class="row-fluid">
					<div class="span2">
						<img src="{main_posts.gravatar}" /><br />
						{main_posts.username}
					</div>
					<div class="span10">
						{main_posts.content}
					</div>
				</div>
			</li>
			<!-- END main_posts -->
			<!-- BEGIN posts -->
			<li>
				<div class="row-fluid">
					<div class="span2">
						<img src="{posts.gravatar}" /><br />
						{posts.username}
					</div>
					<div class="span10">
						{posts.content}
					</div>
					<div class="clear"></div>
				</div>
			</li>
			<!-- END posts -->
		</ul>