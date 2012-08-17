/**
 * Socket.io binding for intercom.js.
 *
 * - When a message is recieved on the socket, it's emitted on intercom.
 * - When a message is emitted via intercom, it's sent over the socket.
 *
 * @author Brian Reavis
 */
 
var SocketBinding = function(socket, options, intercom) {
	var watchedEvents = [];
	
	var onEventAdded = function(name, fn) {
		if (watchedEvents.indexOf(name) === -1) {
			watchedEvents.push(name);
			socket.on(name, function(data) {
				intercom._emit(name, data);
			});
		}
	};

	for (var name in intercom.handlers) {
		for (var i = 0; i < intercom.handlers[name].length; i++) {
			onEventAdded(name, intercom.handlers[name][i]);
		}
	}
	
	intercom.on('event:on', onEventAdded);
	intercom.on('intercom:emit', function(name, message) {
		socket.emit(name, message);
	});
};

SocketBinding.factory = function(object, options, intercom) {
	if (typeof object.socket === 'undefined') { return false };
	return new SocketBinding(object, options, intercom);
};

Intercom.bindings.push(SocketBinding);