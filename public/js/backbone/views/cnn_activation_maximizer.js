define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/cnn_activation_maximizer.html',
	'tfjs132',
	'bootstrap'
], function ($, _, Backbone, CNNActivationMaximizerTemplate, tf) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		models: {
			'mnist_28x28': {
				title: 'MNIST 28x28',
				description: 'Model trained on MNIST digit recognition dataset, it is not suitable for face recognition. Note that it was trained on black and white input, that\'s why it gives a better prediction for the black and white input.'
			}
		},
		initialize: function() {
			this.magnification_size = 64; // set magnification level automatically, get the face recognizer layer
		},
		events: {
			'click #generate_btn': 'onGenerateButtonClicked',
			'click #start_btn': 'onStartButtonClicked',
			'change #model_selector': 'onModelSelected'
		},
		render: function() {
			this.$el.empty();

			let template = _.template(CNNActivationMaximizerTemplate);
			this.$el.append(template());

			$('#progress_bar').hide();
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
		buildLayers: async function(model) {
			this.CNN_layers = [];
			for (let i in model.layers) {
				let layer = model.layers[i], u_pos = layer.name.lastIndexOf('_');
				let layer_type = '', layer_input_shape = [], layer_magnify_level, filter_count;

				switch (layer.name.substring(0, u_pos)) {
					case 'conv2d':
							layer_type = 'Convolutional layer';
							layer_input_shape = [model.layers[i].input.shape[1], model.layers[i].input.shape[2]];
							layer_magnify_level = Math.floor(this.magnification_size/model.layers[i].input.shape[1]);
							filter_count = model.layers[i].outputShape[3];
						break;
					case 'max_pooling2d':
							layer_type = 'Max pooling layer';
							layer_input_shape = [model.layers[i].input.shape[1], model.layers[i].input.shape[2]];
							layer_magnify_level = Math.floor(this.magnification_size/model.layers[i].input.shape[1]);
							filter_count = model.layers[i].outputShape[3];
				}

				if (layer_type != '') {
					this.CNN_layers.push({
						'name': layer.name,
						'index': parseInt(i),
						'input_shape': layer_input_shape,
						'filter_count': filter_count,
						'magnify_level': layer_magnify_level
					});

					$('#layer_container').append('<div class="card bg-light mb-3 cnn_layer"><div class="card-header">' + layer_type + ' ' + layer.name.substring(u_pos+1) + ': ' + (typeof layer.kernelSize === 'undefined'?'':layer.kernelSize[0] + 'x' + layer.kernelSize[1] + ' kernel, ') + 'activation map size: ' + layer.output.shape[1] + 'x' + layer.output.shape[2] + 'px' + '<span></span></div><div class="card-body"><p id="' + layer.name + '" class="card-text"></p></div></div>');
				}
			};

			$('.ajax_loader').hide();
		},

		// Input generator
		onGenerateButtonClicked: async function(e) {
			$('.ajax_loader').show();
			this.createNoisyImage(28, 28);

			let start_time = performance.now(), input_image_processed_data = this.getInputImageData('input_bw');

			// Prediction
			let image2D = tf.tensor1d(input_image_processed_data).reshape([this.CNN_layers[0].input_shape[0], this.CNN_layers[0].input_shape[1], 1]);
			let prediction = this.CNN_model.predict(image2D.expandDims(0));
			let probabilities = await prediction.as1D().data();

			let probabilities_array = new Array();
			for (let i=0;i<probabilities.length;i++) {
				probabilities_array.push({
					number: i,
					probability: probabilities[i]
				});
			}

			probabilities_array.sort(
				function(a, b) {
					return b.probability - a.probability;
				}
			);

			$('#prediction').empty();
			for (let i=0;i<3;i++) {
				$('#prediction').append(probabilities_array[i].number + ': ' + parseInt(probabilities_array[i].probability*1000000)/10000 +'%<br/>');
			}

			let end_time = performance.now();
			$('#prediction_time').text(parseInt((end_time-start_time)*100)/100 + ' ms');

			$('.ajax_loader').hide();
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
			let canvas = document.getElementById('input_bw');
			canvas.width = canvas.height = 28;
			let ctx = canvas.getContext('2d');
			let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

			for (let i = 0; i < imgData.data.length; i += 4) {
				imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = image_data[Math.floor(i/4)];
				imgData.data[i+3] = 255; // alpha
			}

			ctx.putImageData(imgData, 0, 0);

			// Zoomed image
			this.drawZoomedImage(
				document.getElementById('input_bw').getContext("2d"), 28, 28,
				document.getElementById('input_bw_big').getContext("2d"), 200, 200
			);
		},

		// Filter maximum
		getFilterActivationMap: function(image_data) {
			return tf.tidy(() => {
				let model = tf.model({inputs: this.CNN_model.inputs, outputs: this.CNN_model.layers[this.layer_index].output});

				return model.predict(image_data).gather(this.filter_index, 3);
			});
		},
		getFilterLoss: function(image_data) {
			return tf.mean(this.getFilterActivationMap(image_data));
		},
		onStartButtonClicked: function() {
			// https://fairyonice.github.io/Visualization%20of%20Filters%20with%20Keras.html
			// https://blog.keras.io/how-convolutional-neural-networks-see-the-world.html
			// https://js.tensorflow.org/api/latest/#grads
			// https://stackoverflow.com/questions/54728772/computing-the-gradient-of-the-loss-using-tensorflow-js

			let filter_count = 0, iteration_counter = $('#iteration_counter').val();
			for (let l in this.CNN_layers) {
				filter_count += this.CNN_layers[l].filter_count;

				// Canvas
				for (let i=0;i<this.CNN_layers[l].filter_count;i++) {
					let filter_name = this.CNN_layers[l].name + '_filter_' + i;
					let node = document.createElement("canvas");
					node.setAttribute("id", filter_name);
					document.getElementById(this.CNN_layers[l].name).appendChild(node);
				}
			}

			console.log('Total number of filters: ', filter_count);

			// Progress bar
			$('#progress_bar').show();
			$('#progress_bar .progress-bar').addClass('progress-bar-animated');

			let c = 0;
			for (let l in this.CNN_layers) {
				this.layer_index = l;
				
				for (let i=0;i<this.CNN_layers[l].filter_count;i++) {
					this.filter_index = i;
					
					let input_image_tensor = tf.tensor1d(this.getInputImageData('input_bw')).reshape([this.CNN_layers[0].input_shape[0], this.CNN_layers[0].input_shape[1], 1]).expandDims(0);
					for (let j=0;j<iteration_counter;j++) {
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

					this.drawImage(this.CNN_layers[l].name + '_filter_' + i, output_image_data, 5);

					$('#progress_bar .progress-bar').css('width', parseInt(++c/filter_count*100)+'%');
				}
			}

			$('#progress_bar .progress-bar').removeClass('progress-bar-animated');
		},
		getInputImageData: function(input_image_id) {
			let input_source = '', input_canvas = document.getElementById(input_image_id);
			let input_image_data = input_canvas.getContext('2d').getImageData(0, 0, input_canvas.width, input_canvas.height), output = [];

			for (let i=0, k=0; i < input_image_data.data.length; i+=4,k++) {
				output[k] = input_image_data.data[i]/255;
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
		drawZoomedImage: function(source_ctx, sw, sh, target_ctx, tw, th) {
			let source = source_ctx.getImageData(0, 0, sw, sh);
			let sdata = source.data;

			let target = target_ctx.createImageData(tw, th);
			let tdata = target.data;

			let mapx = [];
			let ratiox = sw / tw, px = 0;
			for (let i = 0; i < tw; ++i) {
				mapx[i] = 4 * Math.floor(px);
				px += ratiox;
			}

			let mapy = [];
			let ratioy = sh / th, py = 0;
			for (let i = 0; i < th; ++i) {
				mapy[i] = 4 * sw * Math.floor(py);
				py += ratioy;
			}

			let tp = 0;
			for (py = 0; py < th; ++py) {
				for (px = 0; px < tw; ++px) {
					let sp = mapx[px] + mapy[py];
					tdata[tp++] = sdata[sp++];
					tdata[tp++] = sdata[sp++];
					tdata[tp++] = sdata[sp++];
					tdata[tp++] = sdata[sp++];
				}
			}

			target_ctx.putImageData(target, 0, 0);
		},
		_reshape: function(array, sizes) {
			var accumulator = [];

			if (sizes.length === 0) {
				return array.shift();
			}
			for (var i = 0; i < sizes[0]; i += 1) {
				accumulator.push(this._reshape(array, sizes.slice(1)));
			}

			return accumulator;
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