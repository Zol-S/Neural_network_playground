define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/face_detector.html',
	'tfjs270',
	'bootstrap'
], function ($, _, Backbone, faceDetectorTemplate, tf) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		initialize: async function() {
			this.model = await tf.loadLayersModel('public/js/neural/face_28x28/model.json');
			console.log('Face 28x28 model loaded');
		},
		events: {
			'click p img': 'onImageClicked'
		},
		onImageClicked: async function(e) {
			let imageData = tf.browser.fromPixels(e.target);
			let prediction = this.model.predict(imageData.expandDims(0).toFloat());
			let probability = parseInt((await prediction.as1D().data())[0]*10000)/100;

			$('#stage').append('<p><img src="' + e.target.src + '"> is a face with ' + probability + '% probability.</p>');
			//console.log('Face confidence: ' + (await prediction.as1D().data())[0]*100 + '%');
		},
		render: function() {
			this.$el.empty();

			var template = _.template(faceDetectorTemplate);
			this.$el.append(template());
		},
		destroy: function() {
			this.showTensorflowInformation('Tensorflow state before model disposal');
			tf.disposeVariables();
			this.model.dispose();
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