define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/cnn_layer_visualizer.html',
	'tfjs10',
	'bootstrap'
], function ($, _, Backbone, CNNLayerVisualizerTemplate, tf) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		initialize: async function() {
			this.size = 28;

			// Load layers from model
			// Load models
			document.model = await tf.loadModel('public/js/neural/mnist_28x28/model.json');
			$('#start_btn').removeAttr('disabled');
			console.log('MNIST 28x28 model is loaded');
			//console.log('Olivetti faces 64x64 model is loaded');
		},
		events: {
			'click #start_btn': 'onStartClicked',
			'click #stop_btn': 'onStopClicked',
			'change #fps_selector': 'onStopClicked',
			'change #camera_selector': 'onStopClicked',
			'change #model_selector': 'onStopClicked'
		},
		render: function() {
			this.$el.empty();

			var template = _.template(CNNLayerVisualizerTemplate);
			this.$el.append(template());

			// Populate camera select
			navigator.mediaDevices.enumerateDevices().then(this.onMediaDevicesDetected)
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

			this.embedCameraVideo();
		},
		embedCameraVideo: function() {
			var _self = this;
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

				var tracks = this.video.srcObject.getTracks();

				for (var i = 0; i < tracks.length; i++) {
					var track = tracks[i];
					track.stop();
				}

				this.video.srcObject = null;

				clearInterval(this.interval);
				delete this.interval;
			}
		},
		drawZoomedImage: function(source_ctx, sw, sh, target_ctx, tw, th) {
			var source = source_ctx.getImageData(0, 0, sw, sh);
			var sdata = source.data;

			var target = target_ctx.createImageData(tw, th);
			var tdata = target.data;

			var mapx = [];
			var ratiox = sw / tw, px = 0;
			for (var i = 0; i < tw; ++i) {
				mapx[i] = 4 * Math.floor(px);
				px += ratiox;
			}

			var mapy = [];
			var ratioy = sh / th, py = 0;
			for (var i = 0; i < th; ++i) {
				mapy[i] = 4 * sw * Math.floor(py);
				py += ratioy;
			}

			var tp = 0;
			for (py = 0; py < th; ++py) {
				for (px = 0; px < tw; ++px) {
					var sp = mapx[px] + mapy[py];
					tdata[tp++] = sdata[sp++];
					tdata[tp++] = sdata[sp++];
					tdata[tp++] = sdata[sp++];
					tdata[tp++] = sdata[sp++];
				}
			}

			target_ctx.putImageData(target, 0, 0);
		},
		startImageCapture: function() {
			var _self = this, fps = $('#fps_selector').children("option:selected").val();
			console.log('Sampling at every ' + 1000/fps + ' ms');

			this.interval = setInterval(function() {
				_self.captureImage();
			}, 1000/fps);
		},
		captureImage: async function() {
			var start_time = performance.now();

			var input_canvas_GS = document.querySelector('#input_grayscale');
			var input_context_GS = input_canvas_GS.getContext('2d');
			var input_context_BW = document.querySelector('#input_bw').getContext('2d');

			input_context_GS.drawImage(this.video, 0, 0, input_canvas_GS.width, input_canvas_GS.height);
			input_context_BW.drawImage(this.video, 0, 0, input_canvas_GS.width, input_canvas_GS.height);

			var imgDataGS = input_context_GS.getImageData(0, 0, input_canvas_GS.width, input_canvas_GS.height);
			var imgDataBW = input_context_BW.getImageData(0, 0, input_canvas_GS.width, input_canvas_GS.height);

			var imgDataArray = new Array(784);
			for (var i=0, k=0; i < imgDataGS.data.length; i+=4,k++) {
				var grayscale = imgDataGS.data[i] * .3 + imgDataGS.data[i+1] * .59 + imgDataGS.data[i+2] * .11;
				imgDataArray[k] = grayscale/255;//(grayscale>128?1:0);

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
				document.getElementById('input_grayscale').getContext("2d"), 28, 28,
				document.getElementById('input_grayscale_big').getContext("2d"), 200, 200
			);

			this.drawZoomedImage(
				document.getElementById('input_bw').getContext("2d"), 28, 28,
				document.getElementById('input_bw_big').getContext("2d"), 200, 200
			);

			// Prediction
			/*let image2D = tf.tensor1d(imgDataArray).reshape([28, 28, 1]);
			let prediction = document.model.predict(image2D.expandDims(0));
			//prediction.argMax().print();
			let probabilities = await prediction.as1D().data();

			let probabilities_array = new Array();
			for (var i=0;i<probabilities.length;i++) {
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

			$('#inference').empty();
			for (var i=0;i<3;i++) {
				$('#inference').append(probabilities_array[i].number + ': ' + parseInt(probabilities_array[i].probability*1000000)/10000 +'%<br/>');
			}*/

			var end_time = performance.now();
			$('#inference_time').text(parseInt((end_time-start_time)*100)/100 + ' ms');

			/*this.displayActivationMaps(document.model, "conv2d_1", imgDataArray, "conv2d_1", 1);
			this.displayActivationMaps(document.model, "max_pooling2d_1", imgDataArray, "max_pooling2d_1", 2);
			this.displayActivationMaps(document.model, "conv2d_2", imgDataArray, "conv2d_2", 2);
			this.displayActivationMaps(document.model, "max_pooling2d_2", imgDataArray, "max_pooling2d_2", 5);
			this.displayActivationMaps(document.model, "flatten_1", imgDataArray, "flatten_1", [1, 10]);
			this.displayActivationMaps(document.model, "dense_1", imgDataArray, "dense_1", [4, 10]);
			this.displayActivationMaps(document.model, "dense_2", imgDataArray, "dense_2", [10, 10]);*/

			/*
			conv2d_1
			max_pooling2d_1
			conv2d_2
			max_pooling2d_2
			dropout_1
			flatten_1
			dense_1
			activation_1
			dropout_2
			dense_2
			activation_2  
			*/
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
			var image2D = tf.tensor1d(imageData).reshape([28, 28, 1]).expandDims(0).toFloat();
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
				var act_array = this._reshape(activations_flattened, [layerOutputShape[1], layerOutputShape[2], layerOutputShape[3]]);

				for (var i=0;i<layerOutputShape[3];i++) {
					$('#' + outputDiv).append('<canvas id="' + outputDiv + '_act_' + i + '" height="' + layerOutputShape[2]*scale + '" width="' + layerOutputShape[1]*scale + '"></canvas>');

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