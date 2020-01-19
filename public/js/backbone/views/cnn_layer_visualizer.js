define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/cnn_layer_visualizer.html',
	'tfjs132',
	'bootstrap'
], function ($, _, Backbone, CNNLayerVisualizerTemplate, tf) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		models: {
			'mnist_28x28': {
				title: 'MNIST 28x28',
				description: 'Model trained on MNIST digit recognition dataset, it is not suitable for face recognition. Note that it was trained on black and white input, that\'s why it gives a better prediction for the black and white input.'
			},
			'olivetti_faces_64x64': {
				title: 'Olivetti faces 64x64',
				description: 'Model trained on Olivetti faces dataset with a terrible accuracy. Note that the model is heavy as it has 21 layers,  drawing the 5,571 activation maps might take 30-60 seonds.'
			}
		},
		initialize: function() {
			this.magnification_size = 64; // set magnification level automatically, get the face recognizer layer

			$('#start_btn').attr('disabled', 'disabled');
		},
		events: {
			'click #start_btn': 'onStartClicked',
			'click #stop_btn': 'onStopClicked',
			'change #fps_selector': 'onStopClicked',
			'change #camera_selector': 'onStopClicked',
			'change #model_selector': 'onModelSelected',
			'click .input_canvas': 'onInputCanvasClicked',
			'click .act_map': 'onActivationMapClicked'
		},
		render: function() {
			this.$el.empty();

			let template = _.template(CNNLayerVisualizerTemplate);
			this.$el.append(template());

			// Populate camera select
			navigator.mediaDevices.enumerateDevices().then(this.onMediaDevicesDetected)
		},
		onModelSelected: async function() {
			this.onStopClicked();
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

			$('#input_grayscale').attr('height', model.layers[0].input.shape[1]);
			$('#input_grayscale').attr('width', model.layers[0].input.shape[2]);
			$('#input_bw').attr('height', model.layers[0].input.shape[1]);
			$('#input_bw').attr('width', model.layers[0].input.shape[2]);

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

			$('#start_btn').removeAttr('disabled');
			$('.ajax_loader').hide();
		},
		onMediaDevicesDetected: function(mediaDevices) {
			mediaDevices.forEach(mediaDevice => {
				if (mediaDevice.kind == 'videoinput') {
					$('#camera_selector').append('<option value="' + mediaDevice.deviceId + '">' + mediaDevice.label + '</option>');
				}
			});
		},
		onStartClicked: function() {
			$('.ajax_loader').show();
			$('#start_btn').attr('disabled', 'disabled');
			$('#stop_btn').removeAttr('disabled');

			$('#camera_stream').attr('width', 320);
			$('#camera_stream').attr('height', 240);

			let titleText = 'Sampling rate: ' + 1000/$('#fps_selector').children("option:selected").val() + 'ms, ' + this.CNN_layers[0].input_shape[0] +'x' + this.CNN_layers[0].input_shape[1] + 'px';
			$('#input_stream_header').text(' - ' + titleText);

			this.embedCameraVideo();
		},
		onActivationMapClicked: function(e) {
			$('#activation_map_name').text($(e.target).attr('id'));
			this.selected_activation_map = $(e.target).attr('id');
			this.selected_layer_id = $(e.target).data('layer');
			console.log('Selected activation map: ' + this.selected_activation_map + ' (' + this.selected_layer_id + ')');
		},
		getSelectedImageData: function(selected_image) {
			let input_source = '', input_canvas;
			switch (selected_image) {
				case 'input_grayscale_big':
						input_source = 'Grayscale';
						input_canvas = document.querySelector('#input_grayscale');
					break;
				case 'input_bw_big':
					input_source = 'Black and white';
					input_canvas = document.querySelector('#input_bw');
			}
			$('#prediction_input').text(input_source);

			let input_image_data = input_canvas.getContext('2d').getImageData(0, 0, input_canvas.width, input_canvas.height), output = [];
			for (let i=0, k=0; i < input_image_data.data.length; i+=4,k++) {
				output[k] = input_image_data.data[i]/255;
			}

			return output;
		},
		onInputCanvasClicked: async function(e) {
			$('.ajax_loader').show();
			let start_time = performance.now(), input_image_processed_data = this.getSelectedImageData($(e.target).attr('id'));

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
		embedCameraVideo: function() {
			let _self = this;
			this.video = document.querySelector("#camera_stream");

			if (navigator.mediaDevices.getUserMedia) {
				navigator.mediaDevices.getUserMedia({
						video: {
							deviceId: {
								exact: $('#camera_selector').children("option:selected").val()
							}
						},
						audio: false
					})
					.then(function (stream) {
						_self.video.srcObject = stream;
						
						$('.ajax_loader').hide();

						_self.startImageCapture();
					})
					.catch(function (error) {
						alert("Something went wrong: " + error);
					});
			}
		},
		onStopClicked: function() {
			if (typeof this.interval !== 'undefined') {
				$('#start_btn').removeAttr('disabled');
				$('#stop_btn').attr('disabled', 'disabled');

				$('#camera_stream').attr('width', 0);
				$('#camera_stream').attr('height', 0);

				let tracks = this.video.srcObject.getTracks();

				for (let i = 0; i < tracks.length; i++) {
					let track = tracks[i];
					track.stop();
				}

				this.video.srcObject = null;

				clearInterval(this.interval);
				delete this.interval;
			}
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
		startImageCapture: function() {
			let _self = this, fps = $('#fps_selector').children("option:selected").val();
			console.log('Sampling at every ' + 1000/fps + ' ms');

			this.interval = setInterval(function() {
				_self.captureImage();
			}, 1000/fps);
		},
		captureImage: async function() {
			let input_canvas_GS = document.querySelector('#input_grayscale');
			let input_context_GS = input_canvas_GS.getContext('2d');
			let input_context_BW = document.querySelector('#input_bw').getContext('2d');

			input_context_GS.drawImage(this.video, 0, 0, input_canvas_GS.width, input_canvas_GS.height);
			input_context_BW.drawImage(this.video, 0, 0, input_canvas_GS.width, input_canvas_GS.height);

			let imgDataGS = input_context_GS.getImageData(0, 0, input_canvas_GS.width, input_canvas_GS.height);
			let imgDataBW = input_context_BW.getImageData(0, 0, input_canvas_GS.width, input_canvas_GS.height);

			for (let i=0, k=0; i < imgDataGS.data.length; i+=4,k++) {
				let grayscale = imgDataGS.data[i] * .3 + imgDataGS.data[i+1] * .59 + imgDataGS.data[i+2] * .11;

				imgDataGS.data[i] = grayscale;
				imgDataGS.data[i+1] = grayscale;
				imgDataGS.data[i+2] = grayscale;
				imgDataGS.data[i+3] = 255;

				imgDataBW.data[i] = (grayscale>128?255:0);
				imgDataBW.data[i+1] = (grayscale>128?255:0);
				imgDataBW.data[i+2] = (grayscale>128?255:0);
				imgDataBW.data[i+3] = 255;
			}
			input_context_GS.putImageData(imgDataGS, 0, 0);
			input_context_BW.putImageData(imgDataBW, 0, 0);

			// Zoomed image
			this.drawZoomedImage(
				document.getElementById('input_grayscale').getContext("2d"), this.CNN_layers[0].input_shape[0], this.CNN_layers[0].input_shape[1],
				document.getElementById('input_grayscale_big').getContext("2d"), 200, 200
			);

			this.drawZoomedImage(
				document.getElementById('input_bw').getContext("2d"), this.CNN_layers[0].input_shape[0], this.CNN_layers[0].input_shape[1],
				document.getElementById('input_bw_big').getContext("2d"), 200, 200
			);

			// Show activation map
			if (this.selected_activation_map) {
				this.displayActivationMap(this.selected_activation_map, this.selected_layer_id);
			}
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
			/*console.log('Input shape: ' + document.model.inputs[0].shape);
			console.log('Output shape: ' + document.model.outputs[0].shape);
			console.log('Number of layers in the neural network: ' + document.model.layers.length);
			console.log(document.model);
			console.log('Layer:');
			console.log(document.model.getLayer("conv2d_1"));
			console.log('Layer\'s kernel');
			console.log(await document.model.getLayer("conv2d_1").kernel.val.data());
			console.log('Layer\'s output:');
			console.log(await document.model.getLayer("conv2d_1").output);
			let weights = document.model.getLayer("conv2d_1").getWeights();
			console.log(await weights[0].as1D().data());*/

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
			this.onStopClicked();
			this.undelegateEvents();
			this.$el.empty();
			this.stopListening();
			return this;
		}
	});

	return view;
});