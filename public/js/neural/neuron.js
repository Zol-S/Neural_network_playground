define(function() {
	var returnedModule = function() {
		this.weights = [];
		this.bias = 1;

		this.input = [];
		this.output = 0;
		this.deltas = [];
		this.previousDeltas = [];
		this.gradient = 0;
		this.momentum = 0.7;

		this.parse = function(input) {
			var sum = 0;

			for (var i = 0, len = input.length; i < len; i++) {
				if (!this.weights[i]) {
					this.weights[i] = this.randomWeight(-1, 1);
				}

				sum += input[i] * this.weights[i];
			}
			sum += this.bias;
			this.input = sum;
			return this.output = this.relu(sum);
		}

		this.tanh = function(input) {
			return Math.tanh(input);
		}

		this.relu = function(input) {
			return Math.max(0, input);
		}

		this.sigmoid = function(input) {
			return (1 / (1 + Math.exp(-1 * input)));
		}

		this.randomWeight = function(min, max) {
			return Math.floor(Math.random()*(max-min+1)+min);
		}
	}

	return returnedModule;
});