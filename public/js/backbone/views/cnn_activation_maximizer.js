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
		initialize: function() {
			this.magnification_size = 64; // set magnification level automatically, get the face recognizer layer

			$('.ajax_loader').show();
			this.loadModel();
		},
		events: {
			'click #generate_btn': 'onGenerateButtonClicked',
			'click #maximize_btn': 'onMaximizeButtonClicked',
			'click .act_map': 'onActivationMapClicked'
		},
		render: function() {
			this.$el.empty();

			let template = _.template(CNNActivationMaximizerTemplate);
			this.$el.append(template());
		},
		loadModel: async function() {
			this.CNN_model = await tf.loadLayersModel(window.public_directory + '/js/neural/mnist_28x28/model.json');
			console.log('`MNIST 28x28` model is loaded');

			this.buildLayers(this.CNN_model);
		},
		buildLayers: function(model) {
			this.CNN_layers = [];

			for (let i in model.layers) {
				let layer = model.layers[i], u_pos = layer.name.lastIndexOf('_');
				let layer_title = '', layer_input_shape = [], layer_magnify_level;

				switch (layer.name.substring(0, u_pos)) {
					case 'conv2d':
							layer_title = 'Convolutional layer ' + layer.name.substring(u_pos+1);
							layer_input_shape = [model.layers[i].input.shape[1], model.layers[i].input.shape[2]];
							layer_magnify_level = Math.floor(this.magnification_size/model.layers[i].input.shape[1]);
						break;
					case 'max_pooling2d':
							layer_title = 'Max pooling layer ' + layer.name.substring(u_pos+1);
							layer_input_shape = [model.layers[i].input.shape[1], model.layers[i].input.shape[2]];
							layer_magnify_level = Math.floor(this.magnification_size/model.layers[i].input.shape[1]);
						break;
					case 'flatten':
							layer_title = 'Flatten ' + layer.name.substring(u_pos+1);
							layer_magnify_level = [1, 10];
						break;
					case 'dense':
							layer_title = 'Dense ' + layer.name.substring(u_pos+1);
							layer_magnify_level = [[5, 10], [15, 15]][layer.name.substring(u_pos+1)-1];
				}

				if (layer_title != '') {
					this.CNN_layers.push({
						'name': layer.name,
						'index': parseInt(i),
						'input_shape': layer_input_shape,
						'magnify_level': layer_magnify_level
					});

					$('#layer_container').append('<div class="card bg-light mb-3 cnn_layer"><div class="card-header">' + layer_title + '<span></span></div><div class="card-body"><p id="' + layer.name + '" class="card-text"></p></div></div>');
				}
			};

			$('.ajax_loader').hide();
		},
		createNoisyImage: function(size) {
			let image_data = [];
			for (let i=0;i<size;i++) {
				image_data.push(Math.random()*255);
			}

			this.drawInputImage(image_data);
		},
		drawInputImage: function(image_data) {
			let canvas = document.getElementById('input_bw');
			canvas.width = canvas.height = 28;
			let ctx = canvas.getContext('2d');
			var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

			for (var i = 0; i < imgData.data.length; i += 4) {
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
		onGenerateButtonClicked: async function(e) {
			$('.ajax_loader').show();
			this.createNoisyImage(784);

			let start_time = performance.now(), input_image_processed_data = this.getSelectedImageData('input_bw');

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

			start_time = performance.now();
			for (let i in this.CNN_layers) {
				this.displayActivationMaps(this.CNN_model, this.CNN_layers[i].name, input_image_processed_data, this.CNN_layers[i].name, this.CNN_layers[i].magnify_level);
			}

			end_time = performance.now();
			$('#draw_time').text(parseInt((end_time-start_time)*100)/100 + ' ms');

			$('.ajax_loader').hide();
		},
		onActivationMapClicked: function(e) {
			let selected_id = $(e.target).attr('id');
			let regex = /^(.*_[0-9]*)_act_([0-9]*)/gm;
			let m = regex.exec(selected_id);

			this.layer_name = m[1];
			this.filter_index = parseInt(m[2]);
			
			this.drawSelectedFeatureMap();
		},
		drawSelectedFeatureMap: function() {
			var result = this.CNN_layers.find(x => x.name === this.layer_name);
  
			$('#selected_layer_name').text(this.CNN_model.layers[result.index].name);
			$('#selected_layer_index').text(result.index);
			$('#selected_filter_index').text(this.filter_index);
			$('#selected_filter_size').text(this.CNN_model.layers[result.index].output.shape[1] + 'x' + this.CNN_model.layers[result.index].output.shape[2] + 'px');
			$('#selected_filter_number').text(this.CNN_model.layers[result.index].output.shape[3]);

			let am_model = tf.model({inputs: this.CNN_model.inputs, outputs: this.CNN_model.layers[result.index].output});

			let image2D = tf.tensor1d(this.getSelectedImageData('input_bw')).reshape([this.CNN_layers[0].input_shape[0], this.CNN_layers[0].input_shape[1], 1]).expandDims(0);
			let activations = am_model.predict(image2D).dataSync();

			let ac_min = activations.reduce(function(a, b) { return Math.min(a, b);}), ac_max = activations.reduce(function(a, b) { return Math.max(a, b);});
			let spread = Math.abs(ac_max - ac_min);

			// Upscaling values to the RGB component range
			let activations_flattened = new Array();
			for (let i=0;i<activations.length;i++) {
				activations_flattened.push(parseInt((activations[i]+Math.abs(ac_min))*255/spread));
			}

			let act_array = this._reshape(activations_flattened, [this.CNN_model.layers[result.index].output.shape[1], this.CNN_model.layers[result.index].output.shape[2], this.CNN_model.layers[result.index].output.shape[3]]);
			document.getElementById('feature_map').getContext("2d").clearRect(0, 0, 200, 200);
			this.drawPixels(act_array, this.filter_index, 'feature_map', [this.CNN_model.layers[result.index].output.shape[1], this.CNN_model.layers[result.index].output.shape[2]], result.magnify_level*3, false);
		},
		getSelectedFilterActivations: function(image_data) {
			let current_layer = this.CNN_layers.find(x => x.name === this.layer_name);
			let model = tf.model({inputs: this.CNN_model.inputs, outputs: this.CNN_model.layers[current_layer.index].output});

			return model.predict(image_data).gather(this.filter_index, 3);
		},
		getSelectedFilterLoss: function(image_data) {
			return tf.mean(this.getSelectedFilterActivations(image_data));
		},
		onMaximizeButtonClicked: function() {
			let current_layer = this.CNN_layers.find(x => x.name === this.layer_name);
			let input_image_tensor = tf.tensor1d(this.getSelectedImageData('input_bw')).reshape([this.CNN_layers[0].input_shape[0], this.CNN_layers[0].input_shape[1], 1]).expandDims(0);

			// Visualization
			let filter_activations = this.getSelectedFilterActivations(input_image_tensor).arraySync()[0];
			let ac_min = tf.min(filter_activations).dataSync()[0];
			let spread = 255/Math.abs(tf.max(filter_activations).dataSync()[0] - ac_min);

			var ctx = document.getElementById('feature_map_check').getContext("2d");
			for (var i=0;i<filter_activations.length;i++) {
				for (var k=0;k<filter_activations[0].length;k++) {
					var color = this.convertComponent2Hex(parseInt(filter_activations[k][i]*spread + ac_min));
					ctx.fillStyle="#" + color + color + color;
					ctx.fillRect(i*25, k*25, 25, 25);
				}
			}

			// Loss
			let loss = this.getSelectedFilterLoss(input_image_tensor).dataSync()[0];
			$('#loss').text(loss);
			console.log('Loss: ', loss);

			// Gradients
			const grad_func = tf.grad(this.getSelectedFilterLoss.bind(this));
			let grads = grad_func(input_image_tensor);//.gather(0, 3);

			// Normalization trick
			const eps = tf.sqrt(tf.add(tf.mean(tf.square(grads)), 1e-5));
			grads = tf.div(grads, eps);

			input_image_tensor = tf.add(input_image_tensor, tf.mul(grads, 1));

			// deprocess
			ac_min = tf.min(input_image_tensor).dataSync()[0];
			spread = 255/Math.abs(tf.max(input_image_tensor).dataSync()[0] - ac_min);
			let output_image_data = tf.mul(tf.add(input_image_tensor.gather(0, 3), Math.abs(ac_min)), spread).dataSync();

			this.drawInputImage(output_image_data);

			// https://fairyonice.github.io/Visualization%20of%20Filters%20with%20Keras.html
			// https://blog.keras.io/how-convolutional-neural-networks-see-the-world.html
			// https://js.tensorflow.org/api/latest/#grads
			// https://stackoverflow.com/questions/54728772/computing-the-gradient-of-the-loss-using-tensorflow-js
		},
		getSelectedImageData: function(selected_image) {
			let input_source = '', input_canvas = document.getElementById(selected_image);

			let input_image_data = input_canvas.getContext('2d').getImageData(0, 0, input_canvas.width, input_canvas.height), output = [];
			for (let i=0, k=0; i < input_image_data.data.length; i+=4,k++) {
				output[k] = input_image_data.data[i]/255;
			}

			return output;
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
		displayActivationMaps: function(model, layer, imageData, outputDiv, scale) {
			// https://medium.com/tensorflow/a-gentle-introduction-to-tensorflow-js-dba2e5257702

			// Title
			var layerOutputShape = model.getLayer(layer).output.shape;
			var kernelShape = model.getLayer(layer).kernelSize;
			var is_flattened = false;
			var titleText = (typeof kernelShape!='undefined'?layerOutputShape[3] + ' ' + kernelShape[0] + 'x' + kernelShape[1] + ' kernel, ':'');
			if (typeof layerOutputShape[2] == 'undefined') {
				is_flattened = true;
			}
			titleText += 'activation map size: ' + layerOutputShape[1] + (!is_flattened?'x' + layerOutputShape[2]:'') + 'px';
			$('#' + outputDiv).parent().siblings('.card-header').find('span').empty().append(' - ' + titleText);

			// Create a new NN
			var am_model = tf.model({inputs: model.inputs, outputs: model.getLayer(layer).output});
			var image2D = tf.tensor1d(imageData).reshape([this.CNN_layers[0].input_shape[0], this.CNN_layers[0].input_shape[1], 1]).expandDims(0);
			var activations = am_model.predict(image2D).dataSync();
			var ac_min = activations.reduce(function(a, b) { return Math.min(a, b);}), ac_max = activations.reduce(function(a, b) { return Math.max(a, b);});
			var spread = Math.abs(ac_max - ac_min);

			// Upscaling values to the RGB component range
			var activations_flattened = new Array();
			for (var i=0;i<activations.length;i++) {
				activations_flattened.push(parseInt((activations[i]+Math.abs(ac_min))*255/spread));
			}

			// Draw activations
			$('#' + outputDiv).empty();
			if (is_flattened) {
				$('#' + outputDiv).append('<canvas id="' + outputDiv + '_act" height="' + scale[1] + '" width="1024"></canvas>');
				this.draw1DPixels(activations_flattened, outputDiv + '_act', scale);
			} else {
				let act_array = this._reshape(activations_flattened, [layerOutputShape[1], layerOutputShape[2], layerOutputShape[3]]);
				let layer_index = this.CNN_layers.findIndex(function(l) {
					return l.name == outputDiv
				});

				for (var i=0;i<layerOutputShape[3];i++) {
					$('#' + outputDiv).append('<canvas id="' + outputDiv + '_act_' + i + '" height="' + layerOutputShape[2]*scale + '" width="' + layerOutputShape[1]*scale + '" class="act_map" data-layer="' + layer_index + '"></canvas>');

					this.drawPixels(act_array, i, outputDiv + '_act_' + i, [layerOutputShape[1], layerOutputShape[2]], scale, is_flattened);
				}
			}
		},
		draw1DPixels: function(color_array, id, scale) {
			var ctx = document.getElementById(id).getContext("2d");

			for (var i=0;i<color_array.length;i++) {
				var color = this.convertComponent2Hex(color_array[i]);
				ctx.fillStyle="#" + color + color + color;
				ctx.fillRect(i*scale[0], 0, scale[0], scale[1]);
			}
		},
		drawPixels: function(image_array, item, id, shape, size, is_flattened) {
			var ctx = document.getElementById(id).getContext("2d");

			for (var i=0;i<shape[0];i++) {
				for (var k=0;k<shape[1];k++) {
					var color = this.convertComponent2Hex(image_array[k][i][item]);
					ctx.fillStyle="#" + color + color + color;
					ctx.fillRect(i*size, k*size, size, size);
				}
			}
		},
		convertComponent2Hex: function(c) {
			var hex = c.toString(16);
			return hex.length == 1 ? "0" + hex : hex;
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