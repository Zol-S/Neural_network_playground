define([
	'mathjs'
], function(math) {
	var module = function(id, type, activation, weight, bias) {
		this.type = type;
		this.delta = 0;

		switch (type) {
			case 'hidden':
			case 'output':
				this.activation = activation;
				this.weight = math.transpose(math.matrix([weight]));
				this.bias = bias;
		}

		this.forward = function(x) {
			switch (this.type) {
				case 'input':
						this.output = x;
					break;
				case 'hidden':
				case 'output':
						var xw = math.multiply(x, this.weight);
						var xwb = math.add(xw, this.bias);
						var _self = this;
						this.output = math.map(xwb, function(value) {
							return _self[_self.activation](value);
						});
			}
		};

		/* Getters & setters */
		this.getOutput = function() {
			return this.output;
		};

		this.getWeight = function() {
			return this.weight;
		};

		this.setWeight = function(weight) {
			this.weight = math.transpose(math.matrix([weight]));
		};

		this.getDelta = function() {
			return this.delta;
		};

		this.setDelta = function(delta) {
			this.delta = delta;
		};

		this.getBias = function() {
			return this.bias;
		};

		this.setBias = function(bias) {
			this.bias = bias;
		};

		/* Activation functions */
		this.relu = function(input) {
			return Math.max(0, input);
		}

		this.tanh = function(input) {
			return Math.tanh(input);
		}

		this.sigmoid = function(input) {
			return (1 / (1 + Math.exp(-1 * input)));
		}
	}

	return module;
});