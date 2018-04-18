define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/face_detector.html',
	'tfjs',
	'bootstrap'
], function ($, _, Backbone, faceDetectorTemplate, tf) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		initialize: async function() {
			document.model = await tf.loadModel('public/js/neural/face_28x28/model.json');
			console.log('Face 28x28 model loaded');
		},
		events: {
			'click p img': 'onImageClicked'
		},
		onImageClicked: async function(e) {
			let imageData = tf.fromPixels(e.target);
			let prediction = document.model.predict(imageData.expandDims(0).toFloat());
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
			this.undelegateEvents();
			this.$el.empty();
			this.stopListening();
			return this;
		}
	});

	return view;
});