var localStorage = window.localStorage;
if (typeof localStorage === 'undefined') {
	localStorage = {
		getItem    : function() {},
		setItem    : function() {},
		removeItem : function() {}
	};
}