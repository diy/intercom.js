var localStorage = undefined;

//Checks if the browser has a working localStorage implementation
var hasLocalStorage = (function(localStorage){

	if (typeof localStorage == 'undefined') {
		return false;
	}

	//Create a test key/val of right now
	var key = val = "" + Date.now(),
			hasLS = false;

	try {
		localStorage.setItem(key, val);
		hasLS = (localStorage.getItem(key) == val)
		localStorage.removeItem(key);

		return hasLS;
	} catch (e) {
		return false;
	}
})(window.localStorage);

if (!hasLocalStorage) {
	localStorage = {
		getItem    : function() {},
		setItem    : function() {},
		removeItem : function() {}
	};
} else {
	localStorage = window.localStorage
}