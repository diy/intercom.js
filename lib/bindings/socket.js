/**
 * Socket.io binding for intercom.js.
 *
 * - When a message is received on the socket, it's emitted on intercom.
 * - When a message is emitted via intercom, it's sent over the socket.
 *
 * @author Brian Reavis <brian@thirdroute.com>
 */
 
var SocketBinding = function(socket, options, intercom) {
	options = util.extend({
		id      : null,
		send    : true,
		receive : true
	}, options);
	
	if (options.receive) {
		var watchedEvents = [];
		var onEventAdded = function(name, fn) {
			if (watchedEvents.indexOf(name) === -1) {
				watchedEvents.push(name);
				socket.on(name, function(data) {
					var id = (typeof options.id === 'function') ? options.id(name, data) : null;
					var emit = (typeof options.receive === 'function') ? options.receive(name, data) : true;
					if (emit || typeof emit !== 'boolean') {
						intercom._emit(name, data, id);
					}
				});
			}
		};

		for (var name in intercom.handlers) {
			for (var i = 0; i < intercom.handlers[name].length; i++) {
				onEventAdded(name, intercom.handlers[name][i]);
			}
		}
	
		intercom._on('on', onEventAdded);
	}
	
	if (options.send) {
		intercom._on('emit', function(name, message) {
			var emit = (typeof options.send === 'function') ? options.send(name, message) : true;
			if (emit || typeof emit !== 'boolean') {
				socket.emit(name, message);
			}
		});
	}
};

SocketBinding.factory = function(object, options, intercom) {
	if (typeof object.socket === 'undefined') { return false };
	return new SocketBinding(object, options, intercom);
};

Intercom.bindings.push(SocketBinding);