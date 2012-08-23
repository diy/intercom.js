/**
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
		
	this.origin      = util.guid();
	this.lastMessage = now;
	this.lastCleanup = now;
	this.bindings    = [];
	this.receivedIDs = {};
	
	window.addEventListener('storage', function() {
		self._onStorageEvent.apply(self, arguments);
	});
};

Intercom.prototype._transaction = function(fn) {
	var TIMEOUT   = 1000;
	var WAIT      = 20;

	var self      = this;
	var executed  = false;
	var listening = false;
	var waitTimer = null;

	var lock = function() {
		if (executed) return;

		var now = (new Date()).getTime();
		var activeLock = parseInt(localStorage.getItem(INDEX_LOCK) || 0);
		if (activeLock && now - activeLock < TIMEOUT) {
			if (!listening) {
				self.on('intercom:storage', lock);
				listening = true;
			}
			waitTimer = window.setTimeout(lock, WAIT);
			return;
		}
		executed = true;
		localStorage.setItem(INDEX_LOCK, now);

		fn();
		unlock();
	};

	var unlock = function() {
		if (listening) { self.off('intercom:storage', lock); }
		if (waitTimer) { window.clearTimeout(waitTimer); }
		localStorage.removeItem(INDEX_LOCK);
	};

	lock();
};

Intercom.prototype._cleanup_emit = function() {
	var THRESHOLD_TTL = 50000;
	var self = this;
	
	this._transaction(function() {
		var now = (new Date()).getTime();
		var threshold = now - THRESHOLD_TTL;
		var changed = 0;
		
		var messages = JSON.parse(localStorage.getItem(INDEX_EMIT) || '[]');
		for (var i = messages.length - 1; i >= 0; i--) {
			if (messages[i].timestamp < threshold) {
				messages.splice(i, 1);
				changed++;
			}
		}
		if (changed > 0) {
			localStorage.setItem(INDEX_EMIT, JSON.stringify(messages));
		}
	});
};

Intercom.prototype._cleanup_once = function() {
	var THRESHOLD_TTL = 1000 * 3600;
	var self = this;
	
	this._transaction(function() {
		var now = (new Date()).getTime();
		var threshold = now - THRESHOLD_TTL;
		var changed = 0;
		
		var table = JSON.parse(localStorage.getItem(INDEX_ONCE) || '{}');
		for (var key in table) {
			if (table.hasOwnProperty(key)) {
				if (table[key] < threshold) {
					delete table[key];
					changed++;
				}
			}
		}
		if (changed > 0) {
			localStorage.setItem(INDEX_ONCE, JSON.stringify(table));
		}
	});
};

Intercom.prototype._cleanup = function() {
	var THRESHOLD_THROTTLE = 50;
	var now = (new Date()).getTime();
	if (now - this.lastCleanup < THRESHOLD_THROTTLE) {
		return;
	}
	
	this.lastCleanup = now;
	this._cleanup_emit();
	this._cleanup_once();
};

Intercom.prototype._onStorageEvent = function(event) {
	var key = event && event.key;
	var self = this;

	if (!key || key === INDEX_EMIT) {
		this._transaction(function() {
			var now = (new Date()).getTime();
			var data = localStorage.getItem(INDEX_EMIT);
			var messages = JSON.parse(data || '[]');
			for (var i = 0; i < messages.length; i++) {
				if (messages[i].origin === self.origin) continue;
				if (messages[i].timestamp < self.lastMessage) continue;
				if (messages[i].id) {
					if (self.receivedIDs.hasOwnProperty(messages[i].id)) continue;
					self.receivedIDs[messages[i].id] = true;
				}
				self.trigger(messages[i].name, messages[i].payload);
			}
			self.lastMessage = now;
		});
	}

	window.setTimeout(function() { self._cleanup(); }, 50);
	this.trigger('intercom:storage', event);
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

	var self = this;
	this._transaction(function() {
		var data = localStorage.getItem(INDEX_EMIT) || '[]';
		var delimiter = (data === '[]') ? '' : ',';
		data = [data.substring(0, data.length - 1), delimiter, JSON.stringify(packet), ']'].join('');
		localStorage.setItem(INDEX_EMIT, data);
		self.trigger(name, message);
	});
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

Intercom.prototype.once = function(key, fn) {
	if (!Intercom.supported) return;

	this._transaction(function() {
		var data = JSON.parse(localStorage.getItem(INDEX_ONCE) || '{}');
		if (data.hasOwnProperty(key)) return;
		data[key] = (new Date()).getTime();
		localStorage.setItem(INDEX_ONCE, JSON.stringify(data));
		fn();
	});
};

util.extend(Intercom.prototype, EventEmitter.prototype);

Intercom.bindings = [];
Intercom.supported = (typeof localStorage !== 'undefined');

var INDEX_EMIT = 'intercom';
var INDEX_ONCE = 'intercom_once';
var INDEX_LOCK = 'intercom_lock';

Intercom.destroy = function() {
	localStorage.removeItem(INDEX_LOCK);
	localStorage.removeItem(INDEX_EMIT);
	localStorage.removeItem(INDEX_ONCE);
};