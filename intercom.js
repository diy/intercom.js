var Intercom=(function(){var EventEmitter = function() {};

EventEmitter.prototype.on = function(name, fn) {
	if (typeof this.handlers === 'undefined') {
		this.handlers = {};
	}
	if (!this.handlers.hasOwnProperty(name)) {
		this.handlers[name] = [];
	}
	this.handlers[name].push(fn);
	
	var args = ['event:on'];
	for (var i = 0; i < arguments.length; i++) {
		args.push(arguments[i]);
	}
	this.trigger.apply(this, args);
};

EventEmitter.prototype.off = function(name, fn) {
	if (typeof this.handlers === 'undefined') return;
	
	if (this.handlers.hasOwnProperty(name)) {
		for (var i = this.handlers[name].length - 1; i >= 0; i--) {
			if (this.handlers[name][i] === fn) {
				this.handlers[name].splice(i, 1);
			}
		}
	}
};

EventEmitter.prototype.trigger = function(name) {
	if (typeof this.handlers !== 'undefined' && this.handlers.hasOwnProperty(name)) { 
		var args = Array.prototype.slice.call(arguments, 1);
		for (var i = 0; i < this.handlers[name].length; i++) {
			this.handlers[name][i].apply(this.handlers[name][i], args);
		}
	}
};var localStorage = window.localStorage;
if (typeof localStorage === 'undefined') {
	localStorage = {
		getItem: function(){},
		setItem: function(){}
	};
}var util = {};

util.guid = (function() {
	var S4 = function() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	};
	return function() {
		return S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4();
	};
})();

util.extend = function(a, b) {
	if (typeof a === 'undefined' || !a) { a = {}; }
	if (typeof b === 'object') {
		for (var key in b) {
			if (b.hasOwnProperty(key)) {
				a[key] = b[key];
			}
		}
	}
	return a;
};/**
 * A cross-window broadcast service built on top
 * of the HTML5 localStorage API. The interface
 * mimic socket.io in design.
 *
 * @author Brian Reavis <brian@thirdroute.com>
 * @constructor
 */

var Intercom = function() {
	var self = this;
	var now = (new Date()).getTime();
		
	this.key         = 'intercom';
	this.origin      = util.guid();
	this.lastMessage = now;
	this.lastCleanup = now;
	this.bindings    = [];
	this.receivedIDs = {};
	
	window.addEventListener('storage', function() {
		self._onStorageEvent.apply(self, arguments);
	});
};

Intercom.prototype._cleanup = function() {
	var THRESHOLD_THROTTLE = 50;
	var THRESHOLD_TTL = 1000;
	
	var now = (new Date()).getTime();
	if (now - this.lastCleanup < THRESHOLD_THROTTLE) return;
	this.lastCleanup = now;
	
	var threshold = now - THRESHOLD_TTL; 
	var messages = JSON.parse(localStorage.getItem(this.key) || '[]');
	if (!messages.length) return;
	
	var removed = 0;
	for (var i = messages.length - 1; i >= 0; i--) {
		if (messages[i].timestamp < threshold) {
			messages.splice(i, 1);
			removed++;
		}
	}
	
	if (removed > 0) {
		localStorage.setItem(this.key, JSON.stringify(messages));
	}
};

Intercom.prototype._onStorageEvent = function(event) {
	var now = (new Date()).getTime();
	var key = event && event.key;
	
	if (!key || key === this.key) {
		var messages = JSON.parse(localStorage.getItem(this.key) || '[]');
		for (var i = 0; i < messages.length; i++) {
			if (messages[i].origin === this.origin) continue;
			if (messages[i].timestamp < this.lastMessage) continue;
			if (messages[i].id) {
				if (this.receivedIDs.hasOwnProperty(messages[i].id)) continue;
				this.receivedIDs.push(messages[i].id);
			}
			this.trigger(messages[i].name, messages[i].payload);
		}
		this.lastMessage = now;
	}
	
	this._cleanup();
};

Intercom.prototype._emit = function(name, message, id) {
	id = (typeof id === 'string' || typeof id === 'number') ? String(id) : null;
	if (id && id.length) {
		if (this.receivedIDs.hasOwnProperty(id)) return;
		this.receivedIDs[id] = true;
	}
	
	var packet = {
		id        : id,
		name      : name,
		origin    : this.origin,
		timestamp : (new Date()).getTime(),
		payload   : message
	};

	var data = localStorage.getItem(this.key) || '[]';
	var delimiter = (data === '[]') ? '' : ',';
	data = [data.substring(0, data.length - 1), delimiter, JSON.stringify(packet), ']'].join('');
	localStorage.setItem(this.key, data);
	this.trigger(name, message);
};

Intercom.prototype.bind = function(object, options) {
	for (var i = 0; i < Intercom.bindings.length; i++) {
		var binding = Intercom.bindings[i].factory(object, options || null, this);
		if (binding) { this.bindings.push(binding); }
	}
};

Intercom.prototype.emit = function(name, message) {
	this._emit.apply(this, arguments);
	this.trigger('intercom:emit', name, message);
};

util.extend(Intercom.prototype, EventEmitter.prototype);
Intercom.bindings = [];
Intercom.supported = (typeof localStorage !== 'undefined');/**
 * Socket.io binding for intercom.js.
 *
 * - When a message is received on the socket, it's emitted on intercom.
 * - When a message is emitted via intercom, it's sent over the socket.
 *
 * @author Brian Reavis <brian@thirdroute.com>
 */
 
var SocketBinding = function(socket, options, intercom) {
	options = util.extend({
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
	
		intercom.on('event:on', onEventAdded);
	}
	
	if (options.send) {
		intercom.on('intercom:emit', function(name, message) {
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

Intercom.bindings.push(SocketBinding); return Intercom;})();
