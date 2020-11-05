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
			//'change #desired_output': 'onDesiredOutputChanged',
			'click #start_btn': 'onStartButtonClicked'
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
						'input_shape': layer_input_shape,
						'magnify_level': layer_magnify_level
					});

					$('#layer_container').append('<div class="card bg-light mb-3 cnn_layer"><div class="card-header">' + layer_title + '<span></span></div><div class="card-body"><p id="' + layer.name + '" class="card-text"></p></div></div>');
				}
			};

			// Output selector
			/*let output = '<select id="desired_output">';
			for (let i=0;i<10;i++) {
				output+= '<option value="' + i + '">' + i + '</option>';
			}
			output+= '</select>';
			$('#dense_2').append(output);*/

			$('.ajax_loader').hide();
		},
		createNoisyImage: function() {
			var canvas = document.getElementById('input_bw');
			canvas.width = canvas.height = 28;
			var ctx = canvas.getContext('2d');
			var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

			for (var i = 0; i < imgData.data.length; i += 4) {
				imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = Math.round(Math.random())*255;
				imgData.data[i+3] = 255; // alpha
			}

			ctx.putImageData(imgData, 0, 0);

			// Zoomed image
			this.drawZoomedImage(
				document.getElementById('input_bw').getContext("2d"), 28, 28,
				document.getElementById('input_bw_big').getContext("2d"), 200, 200
			);
		},
		onStartButtonClicked: async function(e) {
			$('.ajax_loader').show();
			this.createNoisyImage();
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
		getSelectedImageData: function(selected_image) {
			let input_source = '', input_canvas = document.getElementById(selected_image);

			let input_image_data = input_canvas.getContext('2d').getImageData(0, 0, input_canvas.width, input_canvas.height), output = [];
			for (let i=0, k=0; i < input_image_data.data.length; i+=4,k++) {
				output[k] = input_image_data.data[i]/255;
			}

			return output;
		},
		/*onDesiredOutputChanged: function() {
			let desired_output = $("#desired_output option:selected").val();
			console.log('Desired output: ', desired_output);
			console.log(this.CNN_model.layers[11]);
		},*/
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
		displayActivationMap: function(current_activation_map, l) {
			//let i = 9, target = 'max_pooling2d_3_act_2';
			let input_image_processed_data = this.getSelectedImageData('input_grayscale_big');
			this.displayActivationMaps(this.CNN_model, this.CNN_layers[l].name, input_image_processed_data, this.CNN_layers[l].name, this.CNN_layers[l].magnify_level);

			this.drawZoomedImage(
				document.getElementById(current_activation_map).getContext("2d"),
				$('#' + current_activation_map).height(),
				$('#' + current_activation_map).width(),
				document.getElementById('activation_map_canvas').getContext("2d"),
				100,
				100
			);
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

			// Draw activatons
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
			//console.log(outputDiv, layerOutputShape[1], layerOutputShape[2], scale);
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