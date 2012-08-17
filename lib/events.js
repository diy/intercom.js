var EventEmitter = function() {};

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
};