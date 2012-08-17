/**
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
Intercom.supported = (typeof localStorage !== 'undefined');