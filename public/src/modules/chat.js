define(['taskbar'], function(taskbar) {

	var module = {};

	module.bringModalToTop = function(chatModal) {
		var topZ = 0;
		$('.modal').each(function() {
		  var thisZ = parseInt($(this).css('zIndex'), 10);
		  if (thisZ > topZ) {
			topZ = thisZ;
		  }
		});
		chatModal.css('zIndex', topZ + 1);
	}

	module.getModal = function(touid) {
		return $('#chat-modal-' + touid);
	}

	module.modalOpen = function(touid) {
		return $('#chat-modal-' + touid).length !== 0;
	}
	module.createModalIfDoesntExist = function(username, touid, callback) {
		var chatModal = $('#chat-modal-' + touid);

		if(!chatModal.length) {
			var chatModal = $('#chat-modal').clone();
			chatModal.attr('id','chat-modal-' + touid);
			var uuid = utils.generateUUID();
			chatModal.attr('UUID', uuid);
			chatModal.appendTo($('body'));
			chatModal.draggable({
				start:function(){
					module.bringModalToTop(chatModal);
				}
			});
			chatModal.find('#chat-with-name').html(username);

			chatModal.find('.close').on('click', function(e) {
				chatModal.hide();
				taskbar.discard('chat', uuid);
			});

			chatModal.on('click', function(e) {
				module.bringModalToTop(chatModal);
			});

			addSendHandler(chatModal, touid);

			getChatMessages(chatModal, touid, callback);

			taskbar.push('chat', chatModal.attr('UUID'), {title:'chat with '+username});
			return chatModal;
		}

		if(callback)
			callback(false, chatModal);

		taskbar.push('chat', chatModal.attr('UUID'), {title:'chat with '+username});
		return chatModal;
	}

	module.load = function(uuid) {
		var chatModal = $('div[UUID="'+uuid+'"]');
		chatModal.show();
		module.bringModalToTop(chatModal);
	}

	module.minimize = function(uuid) {
		var chatModal = $('div[UUID="'+uuid+'"]');
		chatModal.hide();
		taskbar.minimize('chat', uuid);
	}

	function getChatMessages(chatModal, touid, callback) {
		socket.emit('getChatMessages', {touid:touid}, function(messages) {
			for(var i = 0; i<messages.length; ++i) {
				module.appendChatMessage(chatModal, messages[i].content, messages[i].timestamp);
			}

			if(callback)
				callback(true, chatModal);
		});
	}

	function addSendHandler(chatModal, touid) {
		chatModal.find('#chat-message-input').off('keypress');
		chatModal.find('#chat-message-input').on('keypress', function(e) {
			if(e.which === 13) {
				sendMessage(chatModal, touid);
			}
		});

		chatModal.find('#chat-message-send-btn').off('click');
		chatModal.find('#chat-message-send-btn').on('click', function(e){
			sendMessage(chatModal, touid);
			return false;
		});
	}

	function sendMessage(chatModal, touid) {
		var msg = app.strip_tags(chatModal.find('#chat-message-input').val());
		if(msg.length) {
			msg = msg +'\n';
			socket.emit('sendChatMessage', { touid:touid, message:msg});
			chatModal.find('#chat-message-input').val('');
		}
	}

	module.appendChatMessage = function(chatModal, message, timestamp) {
		var chatContent = chatModal.find('#chat-content');

		var date = new Date(parseInt(timestamp, 10));

		chatContent.append('[' + date.toLocaleTimeString() + '] ' + message);
		chatContent.scrollTop(
			chatContent[0].scrollHeight - chatContent.height()
		);
	}

	return module;
});