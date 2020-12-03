define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/cnn_activation_maximizer.html',
	'tfjs174',
	'bootstrap'
], function ($, _, Backbone, CNNActivationMaximizerTemplate, tf) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		models: {
			'mnist_28x28': {
				title: 'MNIST 28x28',
				description: 'The model of MNIST database of handwritten digits. It has a training set of 60,000 examples, and a test set of 10,000 examples. The digits have been size-normalized and centered in a fixed-size image.'
			}
		},
		initialize: function() {
			this.magnification_size = 64; // set magnification level automatically, get the face recognizer layer
		},
		events: {
			'click #generate_btn': 'onGenerateButtonClicked',
			'click #start_btn': 'onStartButtonClicked',
			'click #stop_btn': 'onStopButtonClicked',
			'change #model_selector': 'onModelSelected'
		},
		render: function() {
			this.$el.empty();

			let template = _.template(CNNActivationMaximizerTemplate);
			this.$el.append(template());

			$('#progress_bar').hide();
			document.getElementById("start_btn").disabled = true;
			document.getElementById("stop_btn").disabled = true;
			document.getElementById("iteration_counter").disabled = true;
		},

		// Model selection/initialization
		onModelSelected: async function() {
			$('.ajax_loader').show();
			$('.cnn_layer').remove();

			let selected_model = $('#model_selector').children("option:selected").val();

			if (selected_model != '') {
				this.CNN_model = await tf.loadLayersModel(window.public_directory + '/js/neural/' + selected_model + '/model.json');
				$('#model_description').text(this.models[selected_model].description);
				console.log(this.models[selected_model].title + ' model is loaded');

				this.buildLayers(this.CNN_model);
			}
		},
		buildLayers: function(model) {
			this.CNN_layers = [];
			for (let i in model.layers) {
				let layer = model.layers[i], u_pos = layer.name.lastIndexOf('_');
				let layer_title = '', layer_output_shape = [], layer_magnify_level, filter_count;

				switch (layer.name.substring(0, u_pos)) {
					case 'conv2d':
							layer_title = 'Convolutional layer';
							layer_output_shape = [layer.output.shape[1], layer.output.shape[2]];
							filter_count = layer.output.shape[3];
							layer_magnify_level = Math.floor(this.magnification_size/layer.input.shape[1]);
						break;
					case 'max_pooling2d':
							layer_title = 'Max pooling layer';
							layer_output_shape = [layer.output.shape[1], layer.output.shape[2]];
							filter_count = layer.output.shape[3];
							layer_magnify_level = Math.floor(this.magnification_size/layer.input.shape[1]);
				}

				if (layer_title != '') {
					this.CNN_layers.push({
						'name': layer.name,
						'index': parseInt(i),
						'output_shape': layer_output_shape,
						'filter_count': filter_count,
						'magnify_level': layer_magnify_level
					});

					$('#layer_container').append('<div class="card bg-light mb-3 cnn_layer"><div class="card-header">' + layer_title + ' ' + layer.name.substring(u_pos+1) + ': ' + (typeof layer.kernelSize === 'undefined'?'':layer.kernelSize[0] + 'x' + layer.kernelSize[1] + ' kernel, ') + 'activation map size: ' + layer.output.shape[3] + ' x ' + layer.output.shape[1] + 'x' + layer.output.shape[2] + 'px' + '<span></span></div><div class="card-body"><p id="' + layer.name + '" class="card-text"></p></div></div>');
				}
			};

			$('.ajax_loader').hide();
		},

		// Input generator
		onGenerateButtonClicked: function(e) {
			this.createNoisyImage(28, 28);

			document.getElementById("start_btn").disabled = false;
			document.getElementById("stop_btn").disabled = false;
			document.getElementById("iteration_counter").disabled = false;
		},
		createNoisyImage: function(size_x, size_y) {
			$('#input_image_header').text(size_x + 'x' + size_y + 'px');

			let image_data = [];
			for (let i=0;i<size_x*size_y;i++) {
				image_data.push(Math.random()*255);
			}

			this.drawInputImage(image_data);
		},
		drawInputImage: function(image_data) {
			let canvas = document.getElementById('input_image');
			canvas.width = canvas.height = 28;
			let ctx = canvas.getContext('2d');
			let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

			for (let i = 0; i < imgData.data.length; i += 4) {
				imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = image_data[Math.floor(i/4)];
				imgData.data[i+3] = 255; // alpha
			}

			ctx.putImageData(imgData, 0, 0);
		},

		// Maximize filter mean
		getFilterLoss: function(image_data) {
			return tf.tidy(() => {
				let model = tf.model({inputs: this.CNN_model.inputs, outputs: this.CNN_model.layers[this.layer_index].output});

				return tf.mean(model.predict(image_data).gather(this.filter_index, 3));
			});
		},
		onStopButtonClicked: function() {
			document.getElementById("iteration_counter").disabled = false;
			clearInterval(this.interval_id);
		},
		onStartButtonClicked: function() {
			this.counter = 0;
			this.total_filter_count = 0;

			for (let l in this.CNN_layers) {
				this.total_filter_count += this.CNN_layers[l].filter_count;

				// Canvas
				for (let i=0;i<this.CNN_layers[l].filter_count;i++) {
					let node = document.createElement("canvas");
					node.setAttribute("id", this.CNN_layers[l].name + '_filter_' + i);
					node.width = node.height = node.style.width = node.style.heigth = 0;
					document.getElementById(this.CNN_layers[l].name).appendChild(node);
				}
			}

			// add more models
			console.log('Total number of filters: ', this.total_filter_count);

			// Progress bar
			$('#progress_bar').show();

			this.layer_index = 0;
			this.filter_index = 0;
			this.interval_id = setInterval(
				this.calculateFilterGradients.bind(this),
				0
			);

			document.getElementById("iteration_counter").disabled = true;
		},
		calculateFilterGradients: function() {
			// Calculation
			let input_image_tensor = tf.tensor1d(this.getInputImageData('input_image')).reshape([this.CNN_model.layers[0].input.shape[1], this.CNN_model.layers[0].input.shape[2], 1]).expandDims(0);

			for (let j=0;j<$('#iteration_counter').val();j++) {
				// Gradients
				const grad_func = tf.grad(this.getFilterLoss.bind(this));
				let grads = grad_func(input_image_tensor);

				// Normalization trick
				const eps = tf.sqrt(tf.add(tf.mean(tf.square(grads)), 1e-5));
				grads = tf.div(grads, eps);

				input_image_tensor = tf.add(input_image_tensor, tf.mul(grads, 1));
			}

			// Deprocess
			let ac_min = tf.min(input_image_tensor).dataSync()[0];
			let spread = 255/Math.abs(tf.max(input_image_tensor).dataSync()[0] - ac_min);
			let output_image_data = tf.mul(tf.add(input_image_tensor.gather(this.filter_index, 3), Math.abs(ac_min)), spread).arraySync()[0];

			this.drawImage(this.CNN_layers[this.layer_index].name + '_filter_' + this.filter_index, output_image_data, 2);

			$('#progress_bar .progress-bar').css('width', parseInt(++this.counter/this.total_filter_count*100)+'%');
			$('#progress_bar .progress-bar').text(parseInt(this.counter/this.total_filter_count*100)+'%');

			// Loop handling
			if (
				(this.layer_index == (this.CNN_layers.length-1)) &&
				(this.filter_index == (this.CNN_layers[this.layer_index].filter_count-1))
			) {
				clearInterval(this.interval_id);
				document.getElementById("iteration_counter").disabled = false;
				return;
			}
			
			if ((this.CNN_layers[this.layer_index].filter_count-1) < ++this.filter_index) {
				this.filter_index = 0;
				this.layer_index++;
			}
		},
		getInputImageData: function(input_image_id) {
			let input_source = '', input_canvas = document.getElementById(input_image_id);
			let input_image_data = input_canvas.getContext('2d').getImageData(0, 0, input_canvas.width, input_canvas.height), output = [];

			for (let i=0, k=0; i < input_image_data.data.length; i+=4,k++) {
				output[k] = (input_image_data.data[i]-127)/255;
			}

			return output;
		},
		drawImage: function(id, data_array, size) {
			let node = document.getElementById(id);
			let ctx = node.getContext("2d");

			node.width = 28*size;
			node.height = 28*size;
			node.style.width = 28*size + 'px';
			node.style.heigth = 28*size + 'px';

			for (let i=0;i<data_array.length;i++) {
				for (let k=0;k<data_array[0].length;k++) {
					let color = this.convertComponent2Hex(parseInt(data_array[i][k]));
					ctx.fillStyle="#" + color + color + color;
					ctx.fillRect(i*size, k*size, size, size);
				}
			}
		},

		convertComponent2Hex: function(c) {
			var hex = c.toString(16);
			return hex.length == 1 ? "0" + hex : hex;
		},
		destroy: function() {
			this.undelegateEvents();
			this.$el.empty();
			this.stopListening();
			return this;
		}
	});

	return view;
});
// https://fairyonice.github.io/achieving-top-23-in-kaggles-facial-keypoints-detection-with-keras-tensorflow.html
// https://fairyonice.github.io/Visualization%20of%20Filters%20with%20Keras.html
// https://blog.keras.io/how-convolutional-neural-networks-see-the-world.html
// https://js.tensorflow.org/api/latest/#grads
// https://stackoverflow.com/questions/54728772/computing-the-gradient-of-the-loss-using-tensorflow-js