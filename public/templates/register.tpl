<!-- START Register Template -->

<h1>Register</h1>
<div class="well">
	<label for="email">Email Address</label><input type="email" placeholder="Enter Email Address" id="email" /> <span id="email-notify" class="label label-important"></span> <br />
	<label for="username">Username</label><input type="text" placeholder="Enter Username" id="username" /> <span id="username-notify" class="label label-success"></span> <br />
	<label for="password">Password</label><input type="password" placeholder="Enter Password" id="password" /><br />
	<button class="btn btn-primary" id="register" type="submit">Register Now</button>
</div>
<script type="text/javascript">
(function() {
	var username = document.getElementById('username'),
		password = document.getElementById('password'),
		register = document.getElementById('register'),
		emailEl = document.getElementById('email'),
		username_notify = document.getElementById('username-notify'),
		email_notify = document.getElementById('email-notify');

	register.onclick = function() {
		socket.emit('user.create', {
			username: username.value,
			password: password.value,
			email: emailEl.value
		});
	};

	username.onkeyup = function() {
		if (username.value.length > 2) socket.emit('user.exists', {username: username.value});
		else {
			username_notify.innerHTML = 'Username too short';
			username_notify.className = 'label label-important';
		}
	}
	emailEl.addEventListener('change', function() {
		console.log('checking email existance');
		socket.emit('user.email.exists', { email: emailEl.value });
	}, false);




	ajaxify.register_events(['user.create', 'user.exists', 'user.email.exists']);

	socket.on('user.create', function(data) {
		//console.log('user create: ' + data.status);
		ajaxify.go('/');
		
	});
	socket.on('user.exists', function(data) {
		if (data.exists == true) {
			username_notify.innerHTML = 'Username exists';
			username_notify.className = 'label label-important';
		} else {
			username_notify.innerHTML = 'Not taken';
			username_notify.className = 'label label-success';
		}
	});
	socket.on('user.email.exists', function(data) {
		if (data.exists === true) {
			email_notify.innerHTML = 'Email Address exists';
		} else {
			email_notify.innerHTML = '';
		}
	});
}());
</script>