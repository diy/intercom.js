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

	this.origin         = util.guid();
	this.lastMessage    = now;
	this.bindings       = [];
	this.receivedIDs    = {};
	this.previousValues = {};

	var storageHandler = function() { self._onStorageEvent.apply(self, arguments); };
	if (window.attachEvent) { document.attachEvent('onstorage', storageHandler); }
	else { window.addEventListener('storage', storageHandler, false); };
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
				self._on('storage', lock);
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
		if (listening) { self._off('storage', lock); }
		if (waitTimer) { window.clearTimeout(waitTimer); }
		localStorage.removeItem(INDEX_LOCK);
	};

	lock();
};

Intercom.prototype._cleanup_emit = util.throttle(100, function() {
	var self = this;

	this._transaction(function() {
		var now = (new Date()).getTime();
		var threshold = now - THRESHOLD_TTL_EMIT;
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
});

Intercom.prototype._cleanup_once = util.throttle(100, function() {
	var self = this;

	this._transaction(function() {
		var timestamp, ttl, key;
		var table   = JSON.parse(localStorage.getItem(INDEX_ONCE) || '{}');
		var now     = (new Date()).getTime();
		var changed = 0;

		for (key in table) {
			if (self._once_expired(key, table)) {
				delete table[key];
				changed++;
			}
		}

		if (changed > 0) {
			localStorage.setItem(INDEX_ONCE, JSON.stringify(table));
		}
	});
});

Intercom.prototype._once_expired = function(key, table) {
	if (!table) return true;
	if (!table.hasOwnProperty(key)) return true;
	if (typeof table[key] !== 'object') return true;
	var ttl = table[key].ttl || THRESHOLD_TTL_ONCE;
	var now = (new Date()).getTime();
	var timestamp = table[key].timestamp;
	return timestamp < now - ttl;
};

Intercom.prototype._localStorageChanged = function(event, field) {
	if (event && event.key) {
		return event.key === field;
	}

	var currentValue = localStorage.getItem(field);
	if (currentValue === this.previousValues[field]) {
		return false;
	}
	this.previousValues[field] = currentValue;
	return true;
};

Intercom.prototype._onStorageEvent = function(event) {
	event = event || window.event;
	var self = this;

	if (this._localStorageChanged(event, INDEX_EMIT)) {
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

	this._trigger('storage', event);
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

		window.setTimeout(function() { self._cleanup_emit(); }, 50);
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
	this._trigger('emit', name, message);
};

Intercom.prototype.once = function(key, fn, ttl) {
	if (!Intercom.supported) return;

	var self = this;
	this._transaction(function() {
		var data = JSON.parse(localStorage.getItem(INDEX_ONCE) || '{}');
		if (!self._once_expired(key, data)) return;

		data[key] = {};
		data[key].timestamp = (new Date()).getTime();
		if (typeof ttl === 'number') {
			data[key].ttl = ttl * 1000;
		}

		localStorage.setItem(INDEX_ONCE, JSON.stringify(data));
		fn();

		window.setTimeout(function() { self._cleanup_once(); }, 50);
	});
};

util.extend(Intercom.prototype, EventEmitter.prototype);

Intercom.bindings = [];
Intercom.supported = (typeof localStorage !== 'undefined');

var INDEX_EMIT = 'intercom';
var INDEX_ONCE = 'intercom_once';
var INDEX_LOCK = 'intercom_lock';

var THRESHOLD_TTL_EMIT = 50000;
var THRESHOLD_TTL_ONCE = 1000 * 3600;

Intercom.destroy = function() {
	localStorage.removeItem(INDEX_LOCK);
	localStorage.removeItem(INDEX_EMIT);
	localStorage.removeItem(INDEX_ONCE);
};

Intercom.getInstance = (function() {
	var intercom = null;
	return function() {
		if (!intercom) {
			intercom = new Intercom();
		}
		return intercom;
	};
})();