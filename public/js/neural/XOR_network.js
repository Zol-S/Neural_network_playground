define([
	'jquery',
	'perceptron',
	'mathjs'
], function($, Perceptron, math) {
	var module = function() {
		var inputs = [[0, 0], [0, 1], [1, 0], [1, 1]];
		var expected_outputs = [0, 1, 1, 0];
		var learning_rate = 0.25;

		var i1 = new Perceptron(1, 'input');
		var i2 = new Perceptron(2, 'input');

		var h1 = new Perceptron(3, 'hidden', 'sigmoid', [.15, .2], .35);
		var h2 = new Perceptron(4, 'hidden', 'sigmoid', [.25, .3], .35);

		var o = new Perceptron(5, 'output', 'sigmoid', [.4, .45], .6)

		this.forward = function(input1, input2) {
			i1.forward(input1);
			i2.forward(input2);

			h1.forward(math.matrix([i1.getOutput(), i2.getOutput()]));
			h2.forward(math.matrix([i1.getOutput(), i2.getOutput()]));

			o.forward(math.matrix([h1.getOutput().toArray()[0], h2.getOutput().toArray()[0]]));
			this.output = o.getOutput().toArray()[0];
		};

		this.backward = function() {
			for (var i=0;i<inputs.length;i++) {
				this.forward(inputs[i][0], inputs[i][1]);
				//console.log('Forward [' + inputs[i][0] + ', ' + inputs[i][1] + ']: ' + this.output + ' (expected: ' + expected_outputs[i] + ')');

				// Output
				o.setDelta((this.output - expected_outputs[i]) * this.sigmoid_deriv(this.output));
				var w = o.getWeight().toArray();
				o.setWeight([parseFloat(w[0]) - learning_rate*o.getDelta()*h1.getOutput().toArray()[0], parseFloat(w[1]) - learning_rate*o.getDelta()*h2.getOutput().toArray()[0]]);
				o.setBias(o.getBias() - learning_rate*o.getDelta());
				//console.log('Output - Delta: ' + o.getDelta() + '; W: [' + o.getWeight().toArray()[0] + ', ' + o.getWeight().toArray()[1] + ']; b: ' + o.getBias());

				// Hidden
				h1.setDelta(o.getDelta()*o.getWeight().toArray()[0]*this.sigmoid_deriv(h1.getOutput().toArray()[0]));
				var w1 = h1.getWeight().toArray();
				h1.setWeight([parseFloat(w1[0]) - learning_rate*h1.getDelta()*inputs[i][0], parseFloat(w1[1]) - learning_rate*h1.getDelta()*inputs[i][1]]);
				h1.setBias(h1.getBias() + learning_rate*h1.getDelta());
				//console.log('H1 - Delta: ' + h1.getDelta() + '; W: [' + h1.getWeight().toArray()[0] + ', ' + h1.getWeight().toArray()[1] + ']; b: ' + h1.getBias());

				h2.setDelta(o.getDelta()*o.getWeight().toArray()[1]*this.sigmoid_deriv(h2.getOutput().toArray()[0]));
				var w2 = h2.getWeight().toArray();
				h2.setWeight([parseFloat(w2[0]) - learning_rate*h2.getDelta()*inputs[i][0], parseFloat(w2[1]) - learning_rate*h2.getDelta()*inputs[i][1]]);
				h2.setBias(h2.getBias() - learning_rate*h2.getDelta());
				//console.log('H1 - Delta: [' + h2.getWeight().toArray()[0] + ', ' + h2.getWeight().toArray()[1] + ']; b: ' + h2.getBias());
			}

			// Update weights
			$('#weight1_1_1_new').val(parseInt(h1.getWeight().toArray()[0]*100)/100);
			$('#weight1_1_2_new').val(parseInt(h1.getWeight().toArray()[1]*100)/100);

			$('#weight1_2_1_new').val(parseInt(h2.getWeight().toArray()[0]*100)/100);
			$('#weight1_2_2_new').val(parseInt(h2.getWeight().toArray()[1]*100)/100);

			$('#bias1_1_new').val(parseInt(h1.getBias()*100)/100);
			$('#bias1_2_new').val(parseInt(h2.getBias()*100)/100);

			$('#weight2_1_new').val(parseInt(o.getWeight().toArray()[0]*100)/100);
			$('#weight2_2_new').val(parseInt(o.getWeight().toArray()[1]*100)/100);

			$('#bias2_1_new').val(parseInt(o.getBias()*100)/100);
		};

		this.MSE = function() {
			var error = 0;
			for (var i = 0;i<inputs.length;i++) {
				this.forward(inputs[i][0], inputs[i][1]);
				error += Math.pow(this.output-expected_outputs[i], 2);
			}

			return error/inputs.length;
		};

		this.getOutput = function() {
			return this.output;
		};

		/* Gradient functions */
		/*this.relu = function(input) {
			return Math.max(0, input);
		}

		this.relu_deriv = function(input) {
			return (input>0?1:0);
		}

		this.tanh = function(input) {
			return Math.tanh(input);
		}

		this.tanh_derv = function(input) {
			return 1 - Math.pow(Math.tanh(input), 2)
		}*/

		this.sigmoid = function(input) {
			return (1 / (1 + Math.exp(-1 * input)));
		}

		this.sigmoid_deriv = function(input) {
			return input*(1-input);
		}
	}

	return module;
});