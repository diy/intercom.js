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
};var util = {};

util.isArray = Array.isArray || function(object) {
	Object.prototype.toString.call(v) === '[object Array]';
};

util.clone = function(object) {
	var result;
	
	if (util.isArray(object)) {
		result = [];
		for (var i = 0; i < object.length; i++) {
			result.push(object[i]);
		}
	} else if (typeof object === 'object') {
		result = {};
		for (var key in object) {
			if (object.hasOwnProperty(key)) {
				result[key] = object[key];
			}
		}
	} else {
		result = object;
	}
	
	return result;
};

util.guid = (function() {
	var S4 = function() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	};
	return function() {
		return S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4();
	};
})();

util.extend = function(a, b) {
	for (var key in b) {
		if (b.hasOwnProperty(key)) {
			a[key] = b[key];
		}
	}
	return a;
};/**
 * A cross-window broadcast service built on top
 * of the HTML5 localStorage API. The interface
 * mimic socket.io in design.
 *
 * @author Brian Reavis
 * @constructor
 */

var Intercom = function() {
	var self = this;
	var now = (new Date()).getTime();
		
	this.key         = 'intercom';
	this.origin      = util.guid();
	this.lastMessage = now;
	this.lastCleanup = now;
	
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
			this.trigger(messages[i].name, messages[i].payload);
		}
		this.lastMessage = now;
	}
	
	this._cleanup();
};

Intercom.prototype.bind = function(object, options) {
	for (var i = 0; i < Intercom.bindings.length; i++) {
		Intercom.bindings[i](object, options || null, this);
	}
};

Intercom.prototype.emit = function(name, message) {
	var message = {
		name      : name,
		origin    : this.origin,
		timestamp : (new Date()).getTime(),
		payload   : message
	};

	var data = localStorage.getItem(this.key) || '[]';
	var delimiter = (data === '[]') ? '' : ',';
	data = [data.substring(0, data.length - 1), delimiter, JSON.stringify(message), ']'].join('');
	localStorage.setItem(this.key, data);

	this.trigger(message.name, message.payload);
	this.trigger('intercom:emit', name, message);
};

util.extend(Intercom.prototype, EventEmitter.prototype);
Intercom.bindings = [];
Intercom.supported = (typeof localStorage !== 'undefined');/**
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
}); return Intercom;})();
