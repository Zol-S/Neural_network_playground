define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/face_detection.html',
	'synaptic',
	'bootstrap'
], function ($, _, Backbone, faceDetectionTemplate, synaptic) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		events: {
			'click #start_btn': 'onStartClicked',
			'click #stop_btn': 'onStopClicked',
		},
		initialize: function() {
			navigator.getUserMedia = navigator.getUserMedia ||
									navigator.webkitGetUserMedia ||
									navigator.mozGetUserMedia ||
									null;
		},
		render: function() {
			this.$el.empty();

			var template = _.template(faceDetectionTemplate);
			this.$el.append(template({
				base_url: window.base_url,
				public_directory: window.public_directory
			}));

			this.videoStream = null;
			this.video = $('#video');
		},
		onStartClicked: function() {
			var _self = this;

			navigator.getUserMedia({ video: true }, function(stream) {
				_self.videoStream = stream;
				_self.video[0].src = window.URL.createObjectURL(stream);
				_self.video[0].play();
			},
			function(error) {
				console.log("Video capture error: " + error.code);
			});
		},
		onStopClicked: function() {
			if (this.videoStream) {
				if (this.videoStream.stop) {
					this.videoStream.stop();
				}

				this.videoStream.onended = null;
				this.videoStream = null;
			}

			if (this.video) {
				this.video[0].pause();
				this.video[0].src = "";
			}
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