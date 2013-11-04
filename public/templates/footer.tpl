

	</div><!--END container -->

	<div id="chat-modal" class="modal chat-modal" tabindex="-1" role="dialog" aria-labelledby="Chat" aria-hidden="true" data-backdrop="none">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
					<h3 id="myModalLabel">[[footer:chat.chatting_with]]</h3>
				</div>
				<div class="modal-body">
					<textarea class="form-control" id="chat-content" cols="40" rows="10" readonly></textarea><br/>
					<input id="chat-message-input" type="text" class="form-control" name="chat-message" placeholder="[[footer:chat.placeholder]]"/>
				</div>
				<div class="modal-footer">
					<button type="button" id="chat-message-send-btn" href="#" class="btn btn-primary btn-lg btn-block
					">[[footer:chat.send]]</button>
				</div>
			</div><!-- /.modal-content -->
		</div><!-- /.modal-dialog -->
	</div><!-- /.modal -->

	<div id="upload-picture-modal" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="Upload Picture" aria-hidden="true">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
					<h3 id="myModalLabel">Upload Picture</h3>
				</div>
				<div class="modal-body">
					<form id="uploadForm" action="" method="post" enctype="multipart/form-data">
						<div class="form-group">
							<label for="userPhoto">Upload a picture</label>
							<input type="file" id="userPhotoInput"  name="userPhoto">
							<p class="help-block">You may only upload PNG, JPG, or GIF files under 256kb.</p>
						</div>
						<input id="imageUploadCsrf" type="hidden" name="_csrf" value="" />
					</form>

					<div id="upload-progress-box" class="progress progress-striped">
						<div id="upload-progress-bar" class="progress-bar progress-bar-success" role="progressbar" aria-valuenow="0" aria-valuemin="0">
							<span class="sr-only"> success</span>
						</div>
					</div>

					<div id="alert-status" class="alert alert-info hide"></div>
					<div id="alert-success" class="alert alert-success hide"></div>
					<div id="alert-error" class="alert alert-danger hide"></div>
				</div>
				<div class="modal-footer">
					<button class="btn btn-default" data-dismiss="modal" aria-hidden="true">Close</button>
					<button id="pictureUploadSubmitBtn" class="btn btn-primary">Upload Picture</button>
				</div>
			</div><!-- /.modal-content -->
		</div><!-- /.modal-dialog -->
	</div><!-- /.modal -->

	<div id="alert_window"></div>


	<footer id="footer" class="container footer">
		<div class="copyright">Copyright &copy; 2013 <a target="_blank" href="http://www.nodebb.org">NodeBB</a> by <a target="_blank" href="https://github.com/psychobunny">psychobunny</a>, <a href="https://github.com/julianlam" target="_blank">julianlam</a>, <a href="https://github.com/barisusakli" target="_blank">barisusakli</a> from <a target="_blank" href="http://www.designcreateplay.com">designcreateplay</a></div>
	</footer>

	<script>
		require(['forum/footer']);
	</script>

</body>
</html>