var EventEmitter = function() {};

EventEmitter.createInterface = function(space) {
	var methods = {};
	
	methods.on = function(name, fn) {
		if (typeof this[space] === 'undefined') {
			this[space] = {};
		}
		if (!this[space].hasOwnProperty(name)) {
			this[space][name] = [];
		}
		this[space][name].push(fn);
	};
	
	methods.off = function(name, fn) {
		if (typeof this[space] === 'undefined') return;
		if (this[space].hasOwnProperty(name)) {
			util.removeItem(fn, this[space][name]);
		}
	};
	
	methods.trigger = function(name) {
		if (typeof this[space] !== 'undefined' && this[space].hasOwnProperty(name)) { 
			var args = Array.prototype.slice.call(arguments, 1);
			for (var i = 0; i < this[space][name].length; i++) {
				this[space][name][i].apply(this[space][name][i], args);
			}
		}
	};
	
	return methods;
};

var pvt = EventEmitter.createInterface('_handlers');
EventEmitter.prototype._on = pvt.on;
EventEmitter.prototype._off = pvt.off;
EventEmitter.prototype._trigger = pvt.trigger;

var pub = EventEmitter.createInterface('handlers');
EventEmitter.prototype.on = function() {
	pub.on.apply(this, arguments);
	Array.prototype.unshift.call(arguments, 'on');
	this._trigger.apply(this, arguments);
};
EventEmitter.prototype.off = pub.off;
EventEmitter.prototype.trigger = pub.trigger;