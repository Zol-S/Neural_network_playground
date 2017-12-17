define(["layer", "neuron"], function(layer, neuron) {
	var returnedModule = function() {
		this.initialize = function(neurons, options) {
			this.options = Object.assign({}, options, {
				learningRate: 0.3,
				momentum: 0.9
			});

			this._layers = new Array(neurons.length);
			for (var i = 0, len = neurons.length; i < len; i++) {
				this._layers[i] = new layer();
				for (j = 0; j < neurons[i]; j++) {
					this._layers[i]._neurons.push(new neuron());
				}
			}
		};

		this.input = function(input) {
			var result = input.slice();
			for (var i = 0, len = this._layers.length; i < len; i++) {
				result = this._layers[i].parse(result);
			}

			return result;
		};

		this.train = function(inputs, ideals) {
			var err = 1, index;
			for (var i = 0; err > 0.001; i++) { // 0.0001
				index = i % inputs.length;
				err = this._iteration(inputs[index], ideals[index]);
			}
			console.log('Training finished after ' + i + ' rounds.');
		};

		this._iteration = function(input, ideal) {
			var i, j, k, previous, error, sigErr;
			var neuron, output;

			this.input(input);
			sigErr = 0.0;

			for (i = this._layers.length-1; i >= 0; i--) {
				if (!this._layers[i+1]) {
					for (j = 0; j < this._layers[i]._neurons.length; j++) {
						neuron = this._layers[i]._neurons[j];
						output = neuron.output;

						neuron.gradient = output * (1 - output) * (ideal[j] - output);
						sigErr += Math.pow((ideal[j] - output), 2);
					}
				} else {
					for (j = 0; j < this._layers[i]._neurons.length; j++) {
						neuron = this._layers[i]._neurons[j];
						output = neuron.output;
						error = 0.0;
						for (k = 0; k < this._layers[i+1]._neurons.length; k++) {
							error += this._layers[i+1]._neurons[k].weights[j] * this._layers[i+1]._neurons[k].gradient;
						}

						neuron.gradient = output * (1 - output) * error;
					}
				}
			}

			for (i = 0; i < this._layers.length; i++) {
				for (j = 0; j < this._layers[i]._neurons.length; j++) {
					neuron = this._layers[i]._neurons[j];
					neuron.bias += this.options.learningRate * neuron.gradient;
					for (k = 0; k < neuron.weights.length; k++) {
						neuron.deltas[k] = this.options.learningRate * neuron.gradient * (this._layers[i-1] ? this._layers[i-1]._neurons[k].output : input[k]);
						neuron.weights[k] += neuron.deltas[k];
						neuron.weights[k] += this.options.momentum * neuron.previousDeltas[k];
					}
					neuron.previousDeltas = neuron.deltas.slice();
				}
			}

			return sigErr;
		};
	}

	return returnedModule;
});