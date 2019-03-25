define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/cnn_layer_visualizer.html',
	'tfjs',
	'bootstrap'
], function ($, _, Backbone, CNNLayerVisualizerTemplate, tf) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		initialize: async function() {
			document.model = await tf.loadLayersModel('public/js/neural/catdog_64x48/model.json');
			console.log('CatDog 64x48 model loaded');
		},
		events: {
			'click #snap_btn': 'takeImage'
		},
		render: function() {
			this.$el.empty();

			var template = _.template(CNNLayerVisualizerTemplate);
			this.$el.append(template());

			this.embedCameraVideo();
		},
		embedCameraVideo: function() {
			var _self = this;
			this.video = document.querySelector("#videoElement");

			if (navigator.mediaDevices.getUserMedia) {
				navigator.mediaDevices.getUserMedia({ video: true })
					.then(function (stream) {
						_self.video.srcObject = stream;
					})
					.catch(function (error) {
						console.log("Something went wrong!");
					});
			}

			this.video.addEventListener('loadedmetadata', function() {
				canvas.width = 64;
				canvas.height = 48;
			},false);
		},
		takeImage: async function() {
			var canvas = document.querySelector('canvas');
			var context = canvas.getContext('2d');

			context.fillRect(0, 0, 64, 48);
			context.drawImage(this.video, 0, 0, 64, 48);

			// Predict
			// https://www.tensorflow.org/js/tutorials/conversion/import_keras
			const example = tf.browser.fromPixels(canvas);
			const prediction = document.model.predict(example.expandDims(0).toFloat());
			const probability = parseInt((await prediction.as1D().data())[0]*10000)/100;
			console.log('Cat confidence: ' + probability + '%');
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