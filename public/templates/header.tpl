<!DOCTYPE html>
<html>
<head>
	<title></title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link href="/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet" media="screen">
	<link href="/vendor/bootstrap/css/bootstrap-responsive.min.css" rel="stylesheet" media="screen">
	<link rel="stylesheet" href="/vendor/fontawesome/css/font-awesome.min.css">
	<script type="text/javascript" src="http://code.jquery.com/jquery.js"></script>
	<script type="text/javascript" src="/vendor/bootstrap/js/bootstrap.min.js"></script>
	<script type="text/javascript" src="/socket.io/socket.io.js"></script>
	<script type="text/javascript" src="/src/app.js"></script>
	<script type="text/javascript" src="/src/templates.js"></script>
	<script type="text/javascript" src="/src/ajaxify.js"></script>
	<link rel="stylesheet" type="text/css" href="/css/style.css" />
</head>

<body>
	<div class="navbar navbar-inverse navbar-fixed-top">
		<div class="navbar-inner">
			<div class="container">
				<a class="brand" href="/">NodeBB</a>
				<button type="button" class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
				</button>
				<div class="nav-collapse collapse">
					<ul class="nav">
						<li id="fat-menu" class="active dropdown">
	                      <a href="#" id="topic_dropdown" role="button" class="dropdown-toggle" data-toggle="dropdown">Topics <span class="badge badge-inverse">3</span></a>
	                      <ul class="dropdown-menu" role="menu" aria-labelledby="topic_dropdown">
	                        <li role="presentation"><a role="menuitem" tabindex="-1" href="#">latest post</a></li>
							<li role="presentation"><a role="menuitem" tabindex="-1" href="#">another latest post</a></li>
							<li role="presentation"><a role="menuitem" tabindex="-1" href="#">moar latest posts</a></li>
	                      </ul>
	                    </li>

					</ul>
					<ul class="nav pull-right" id="right-menu">
						<li><a href="/account" id="user_label"></a></li>
					</ul>
				</div>
			</div>
		</div>
	</div>
	<div id="post_window">
		<div class="post-title-container">
			<div class="container">
				<input id="post_title" placeholder="Enter your topic title here." />
				<span id="reply_title"></span>
			</div>
		</div>
		<div class="post-content-container">
			<div class="container">

				<div class="btn-toolbar">
					<div class="btn-group">
						<span class="btn btn-link" tabindex="-1"><i class="icon-bold"></i></span>
						<span class="btn btn-link" tabindex="-1"><i class="icon-italic"></i></span>
						<span class="btn btn-link" tabindex="-1"><i class="icon-font"></i></span>
						<span class="btn btn-link" tabindex="-1"><i class="icon-list"></i></span>
					</div>
					<div class="btn-group" style="float: right; margin-right: -12px">
						<span id="submit_post_btn" class="btn" onclick="app.post_topic()"><i class="icon-ok"></i> Submit</span>
						<span class="btn" onclick="jQuery(post_window).slideToggle(250);"><i class="icon-remove"></i> Discard</span>
					</div>
				</div>

				<textarea id="post_content" placeholder="Type your message here."></textarea>

			</div>
		</div>
	</div>
	<div id="notification_window"></div>

	<div class="container" id="content">