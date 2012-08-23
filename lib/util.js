var util = {};

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
};

util.removeItem = function(item, array) {
	for (var i = array.length - 1; i >= 0; i--) {
		if (array[i] === item) {
			array.splice(i, 1);
		}
	}
	return array;
};