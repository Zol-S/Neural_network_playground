define(function() {
	var returnedModule = function() {
		this._neurons = [];

		this.parse = function(input) {
			var result = [];

			for (var i = 0, len = this._neurons.length; i < len; i++) {
				result[i] = this._neurons[i].parse(input);
			}

			return result;
		}
	}

	return returnedModule;
});