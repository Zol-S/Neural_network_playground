define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/digit_recognizer.html',
	'tfjs4220',
	'heatmap',
	'json!neural/mnist_dataset/mnist_dataset_100.json',
	'bootstrap'
], function ($, _, Backbone, digitRecognizerTemplate, tf, h337, mnist_data) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		initialize: async function() {
			console.log('Digit recognizer');
			this.size = 28;
			this.draw_state = 0; // 0 - not drawing, 1 - draw, 2 - erase
			this.selected_digit = -1;

			this.showTensorflowInformation('Tensorflow state before initialization');
			this.CNN_model = await tf.loadLayersModel('public/js/neural/mnist_28x28/model.json');
			this.showTensorflowInformation('Tensorflow state after model is loaded');
			$('#recognize_btn').removeAttr('disabled');
		},
		events: {
			'click #canvas div': 'onPixelClicked',
			'mouseenter #canvas div': 'onPixelHovered',
			'mouseup #canvas': 'onClearDrawState',
			'click #recognize_btn': 'onRecognizeClicked',
			'click #clear_btn': 'onClearClicked',
			'click .digit': 'onDigitClicked'
		},
		render: function() {
			this.$el.empty();

			var template = _.template(digitRecognizerTemplate);
			this.$el.append(template({
				base_url: window.base_url,
				public_directory: window.public_directory
			}));

			this.drawDigitBoard();
		},
		drawDigitBoard: function() {
			$('#canvas').empty();

			for (var i=0;i<this.size;i++) {
				for (var k=0;k<this.size;k++) {
					$('#canvas').append('<div id="rect_' + i + '_' + k + '" class="small_rectangle" style="top:' + (i*5) + 'px;left:' + (k*5) + 'px;"></div>');
				}
			}
		},
		onPixelClicked: function(e) {
			this.draw_state = ($(e.target).hasClass('pixel_on')?2:1);

			if (this.draw_state == 1) {
				$(e.target).addClass('pixel_on');
			} else if (this.draw_state == 2) {
				$(e.target).removeClass('pixel_on');
			}
		},
		onPixelHovered: function(e) {
			if (e.buttons == 1 || e.buttons == 3) {
				if (this.draw_state == 0) {
					this.draw_state = ($(e.target).hasClass('pixel_on')?2:1);
				} else if (this.draw_state == 1) {
					$(e.target).addClass('pixel_on');
				} else if (this.draw_state == 2) {
					$(e.target).removeClass('pixel_on');
				}
			}
		},
		onClearDrawState: function(e) {
			this.draw_state = 0;
		},
		onClearClicked: function() {
			$('#canvas div').removeClass('pixel_on');
		},
		getAllIndexes: function(arr, val) {
			var indexes = [], i;
			for	(i = 0; i < arr.length; i++)
				if (arr[i] === val) indexes.push(i);

			return indexes;
		},
		onDigitClicked: function(e) {
			this.onClearClicked();
			this.selected_digit = parseInt($(e.target).text());

			let selected_digits = this.getAllIndexes(mnist_data.test_label, this.selected_digit);
			console.log('There are ' + selected_digits.length + ' digits in the test set');
			let random_mnist_digit_id = selected_digits[Math.floor(Math.random()*selected_digits.length)];

			for (var i=0;i<this.size;i++) {
				for (var k=0;k<this.size;k++) {
					if (mnist_data.test_data[random_mnist_digit_id][i][k] > 127) {
						$('#rect_' + i + '_' + k).addClass('pixel_on');
					}
				}
			}
		},
		getInputData: function() {
			let imageData = new Array(784);
			for (let i=0;i<this.size;i++) {
				for (let k=0;k<this.size;k++) {
					if ($('#rect_' + i + '_' + k).hasClass('pixel_on')) {
						imageData[this.size*i+k] = 1;
					} else {
						imageData[this.size*i+k] = 0;
					}
				}
			}

			return imageData;
		},
		onRecognizeClicked: function() {
			let start_time = performance.now();
			let imageData = this.getInputData();

			// Prediction
			let image2D = tf.tensor4d(imageData, [1, 28, 28, 1]);
			let prediction = this.CNN_model.predict(image2D);
			let probabilities = prediction.dataSync();
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

			$('#inference').empty();
			for (let i=0;i<3;i++) {
				$('#inference').append(probabilities_array[i].number + ': ' + parseInt(probabilities_array[i].probability*1000000)/10000 +'%<br/>');
			}

			$('#inference_time').text(parseInt((performance.now()-start_time)*100)/100 + ' ms');

			this.displayActivationMaps("conv2d_1", imageData, "conv2d_1", 1);
			this.displayActivationMaps("max_pooling2d_1", imageData, "max_pooling2d_1", 2);
			this.displayActivationMaps("conv2d_2", imageData, "conv2d_2", 2);
			this.displayActivationMaps("max_pooling2d_2", imageData, "max_pooling2d_2", 5);
			this.displayActivationMaps("flatten_1", imageData, "flatten_1", [1, 10]);
			this.displayActivationMaps("dense_1", imageData, "dense_1", [4, 10]);
			this.displayActivationMaps("dense_2", imageData, "dense_2", [10, 10]);

			// Grad-CAM
			this.drawClassActivationMap(prediction);
		},
		// https://towardsdatascience.com/live-visualisations-of-cnns-activation-maps-using-tensorflow-js-27353cfffb43
		// https://medium.com/@valentinaalto/class-activation-maps-in-deep-learning-14101e2ec7e1
		drawClassActivationMap: function(prediction) {
			//console.log(this.CNN_model.layers);

			// Search for the last conv layer
			let last_conv_layer_index = this.CNN_model.layers.length - 1;
			while (last_conv_layer_index >= 0) {
				if (this.CNN_model.layers[last_conv_layer_index].getClassName().startsWith('Conv')) {
					break;
				}
				last_conv_layer_index--;
			}
			console.log('Last convolutional layer is `' + this.CNN_model.layers[last_conv_layer_index].name + '` (' + last_conv_layer_index + ')');

			// Prediction
			let classIndex = prediction.argMax(1).dataSync()[0];
			console.log('Selected output: ' + classIndex);

			// Submodel 1
			const sm1_model = tf.model({
				inputs: this.CNN_model.inputs,
				outputs: this.CNN_model.layers[last_conv_layer_index].output
			});

			// Submodel 2
			// https://github.com/tensorflow/tfjs-examples/blob/master/visualize-convnet/cam.js
			/*const sm2_input = tf.input({shape: this.CNN_model.layers[last_conv_layer_index++].output.shape.slice(1)});
			let y = sm2_input;
			while (last_conv_layer_index < this.CNN_model.layers.length) {
				y = this.CNN_model.layers[last_conv_layer_index++].apply(y);
			}

			const sm2_model = tf.model({
				inputs: sm2_input,
				outputs: y
			});*/

			// Custom
			/*let sm2_layers = this.CNN_model.layers.slice(last_conv_layer_index+2);
			sm2_layers.unshift(tf.layers.inputLayer({inputShape: this.CNN_model.layers[last_conv_layer_index].output.shape.slice(1)}));
			const sm2_model = tf.sequential({name: 'Submodel 2', layers: sm2_layers});*/
	
			const sm2_model = tf.sequential();
			sm2_model.add(tf.layers.inputLayer({inputShape: this.CNN_model.layers[last_conv_layer_index].output.shape.slice(1)}));
			sm2_model.add(tf.layers.maxPooling2d({poolSize: [2, 2]}));
			//sm2_model.add(tf.layers.dropout({rate: 0.25}));
			sm2_model.add(tf.layers.flatten());

			sm2_model.add(tf.layers.dense({units: 128})); // , activation: 'relu'
			sm2_model.layers[3].setWeights(this.CNN_model.layers[8].getWeights());

			sm2_model.add(tf.layers.activation({activation: 'relu'}));
			//sm2_model.add(tf.layers.dropout({rate: 0.5}));

			sm2_model.add(tf.layers.dense({units: 10})); // , activation: 'softmax'
			sm2_model.layers[5].setWeights(this.CNN_model.layers[11].getWeights());
			
			let output_image_data;

			tf.tidy(() => {
				const convOutput2ClassOutput = (input) => sm2_model.apply(input, {training: true}).gather([classIndex], 1);
				const gradFunction = tf.grad(convOutput2ClassOutput);

				let input_image_tensor = tf.tensor4d(this.getInputData(), [1, 28, 28, 1]);
				const lastConvLayerOutputValues = sm1_model.apply(input_image_tensor);
				const gradValues = gradFunction(lastConvLayerOutputValues);
				const pooledGradValues = tf.mean(gradValues, [0, 1, 2]);

				const scaledConvOutputValues = lastConvLayerOutputValues.mul(pooledGradValues);
				let heatMap = scaledConvOutputValues.mean(-1);
				heatMap = heatMap.relu();
				heatMap = heatMap.div(heatMap.max()).squeeze();

				output_image_data = tf.mul(heatMap, 255).arraySync();
			});

			this.drawHeatMap(output_image_data);
		},
		drawHeatMap: function(image_data) {
			this.drawPixels('heatmap_image', image_data, 0, 4);
			
			let points = [], max= 0;
			for (let i=0;i<8;i++) {
				for (let j=0;j<8;j++) {
					max = Math.floor(Math.max(image_data[i][j], max));
					if (0 < image_data[i][j][0]) {
						points.push({
							x: j*10,
							y: i*10,
							value: parseInt(image_data[i][j])
						});
					}
				}
			}

			$('#heatmap').empty();
			let heatmapInstance = h337.create({
				container: document.querySelector('#heatmap')
			});

			heatmapInstance.setData({
				max: max,
				data: points
			});
		},
		displayActivationMaps: async function(layer, imageData, outputDiv, scale) {
			// Title
			let layerOutputShape = this.CNN_model.getLayer(layer).output.shape;
			let kernelShape = await this.CNN_model.getLayer(layer).kernelSize;
			let is_flattened = false;
			let titleText = (typeof kernelShape!='undefined'?layerOutputShape[3] + ' ' + kernelShape[0] + 'x' + kernelShape[1] + ' kernel, ':'');
			if (typeof layerOutputShape[2] == 'undefined') {
				is_flattened = true;
			}
			titleText += 'activation map size: ' + layerOutputShape[1] + (!is_flattened?'x' + layerOutputShape[2]:'') + 'px';
			$('#' + outputDiv).parent().siblings('.card-header').find('span').empty().append(' - ' + titleText);

			// Create a new NN
			let _self = this, output_image_data;
			tf.tidy(() => {
				let model = tf.model({inputs: _self.CNN_model.inputs, outputs: _self.CNN_model.model.getLayer(layer).output});

				let activations = model.predict(tf.tensor1d(imageData).reshape([_self.size, _self.size, 1]).expandDims(0).toFloat());

				let ac_min = tf.min(activations).dataSync()[0];
				let spread = 255/Math.abs(tf.max(activations).dataSync()[0] - ac_min);
				output_image_data = tf.mul(tf.add(activations, Math.abs(ac_min)), spread).arraySync()[0];
			});

			// Draw activatons
			$('#' + outputDiv).empty();
			if (is_flattened) {
				$('#' + outputDiv).append('<canvas id="' + outputDiv + '_act" height="' + scale[1] + '" width="1024"></canvas>');
				this.draw1DPixels(outputDiv + '_act', output_image_data, scale);
			} else {
				for (let i=0;i<layerOutputShape[3];i++) {
					$('#' + outputDiv).append('<canvas id="' + outputDiv + '_act_' + i + '" height="' + layerOutputShape[2]*scale + '" width="' + layerOutputShape[1]*scale + '"></canvas>');

					this.drawPixels(outputDiv + '_act_' + i, output_image_data, i, scale);
				}
			}
		},
		drawPixels: function(id, data_array, index, scale) {
			let ctx = document.getElementById(id).getContext("2d");

			for (let i=0;i<data_array.length;i++) {
				for (let k=0;k<data_array[0].length;k++) {
					let color = this.convertComponent2Hex(data_array[i][k][index]);
					ctx.fillStyle="#" + color + color + color;
					ctx.fillRect(k*scale, i*scale, scale, scale);
				}
			}
		},
		draw1DPixels: function(id, data_array, scale) {
			let ctx = document.getElementById(id).getContext("2d");

			for (let i=0;i<data_array.length;i++) {
				let color = this.convertComponent2Hex(data_array[i]);
				ctx.fillStyle="#" + color + color + color;
				ctx.fillRect(i*scale[0], 0, scale[0], scale[1]);
			}
		},
		convertComponent2Hex: function(c) {
			var hex = parseInt(c).toString(16);
			return hex.length == 1 ? "0" + hex : hex;
		},
		destroy: function() {
			this.showTensorflowInformation('Tensorflow state before model disposal');
			tf.disposeVariables();
			this.CNN_model.dispose();
			this.showTensorflowInformation('Tensorflow state after disposal');

			this.undelegateEvents();
			this.$el.empty();
			this.stopListening();
			return this;
		},
		showTensorflowInformation: function(msg) {
			console.group(msg);
			console.log('Number of bytes allocated:', this.getReadableFileSizeString(tf.memory().numBytes));
			console.log('Number of Tensors in memory: ', tf.memory().numTensors);
			console.log('Number of unique data buffers allocated:', tf.memory().numDataBuffers);
			if (tf.memory().unreliable) {
				console.log('Reasons why the memory is unreliable:', tf.memory().reasons);
			}
			console.groupEnd();
		},
		getReadableFileSizeString: function(fileSizeInBytes) {
			let i = -1;
			let byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
			do {
				fileSizeInBytes = fileSizeInBytes / 1024;
				i++;
			} while (fileSizeInBytes > 1024);

			return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
		}
	});

	return view;
});