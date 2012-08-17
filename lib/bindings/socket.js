/**
 * Socket.io binding for intercom.js.
 *
 * - When a message is recieved on the socket, it's emitted on intercom.
 * - When a message is emitted via intercom, it's sent over the socket.
 *
 * @author Brian Reavis
 */

Intercom.bindings.push(function(object, options, intercom) {
	if (typeof object.socket === 'undefined') return;
	var socket = object;
	var watchedEvents = []; 

	var onEvent = function(name, fn) {
		if (watchedEvents.indexOf(name) === -1 && !/^(event|intercom):/.test(name)) {
			watchedEvents.push(name);
			socket.on(name, function(data) {
				intercom.emit(name, data);
			});
		}
	};

	for (var name in intercom.handlers) {
		for (var i = 0; i < intercom.handlers[name].length; i++) {
			onEvent(name, intercom.handlers[name][i]);
		}
	}

	intercom.on('event:on', onEvent);
	intercom.on('intercom:emit', function(name, message) {
		socket.emit(name, message);
	});
});