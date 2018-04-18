define([
	'jquery',
	'backbonejs',
	'backbone/views/backpropagate',
	'backbone/views/xor',
	'backbone/views/neighbor',
	'backbone/views/nnc',
	'backbone/views/classify_2d',
	'backbone/views/max_pooler',
	'backbone/views/number_recognizer',
	'backbone/views/loss_functions',
	'backbone/views/mnist_pca',
	'backbone/views/face_detector',
], function ($, Backbone, BackpropagateView, XorView, NeighborView, NNCView, Classify2DView, MaxPoolerView, NumberRecognizerView, LossFunctionsView, MnistPCAView, FaceDetectorView) {
	'use strict';

	var router = Backbone.Router.extend({
		routes: {
			'backpropagate': 'backpropagate',
			'xor': 'xor',
			'neighbor': 'neighbor',
			'nnc': 'nnc',
			'classify_2d': 'classify_2d',
			'max_pooler': 'max_pooler',
			'number_recognizer': 'number_recognizer',
			'loss_functions': 'loss_functions',
			'mnist_pca': 'mnist_pca',
			'face_detector': 'face_detector',
			'*default': 'xor'
		},

		// Routes
		backpropagate: function() {
			var backpropagateView = new BackpropagateView();
			this.changeView(backpropagateView);
		},
		xor: function() {
			var xorView = new XorView();
			this.changeView(xorView);
		},
		neighbor: function() {
			var neighborView = new NeighborView();
			this.changeView(neighborView);
		},
		nnc: function() {
			var nncView = new NNCView();
			this.changeView(nncView);
		},
		classify_2d: function() {
			var classify2DView = new Classify2DView();
			this.changeView(classify2DView);
		},
		max_pooler: function() {
			var maxPoolerView = new MaxPoolerView();
			this.changeView(maxPoolerView);
		},
		number_recognizer: function() {
			var numberRecognizerView = new NumberRecognizerView();
			this.changeView(numberRecognizerView);
		},
		loss_functions: function() {
			var lossFunctionsView = new LossFunctionsView();
			this.changeView(lossFunctionsView);
		},
		mnist_pca: function() {
			var mnistPCAView = new MnistPCAView();
			this.changeView(mnistPCAView);
		},
		face_detector: function() {
			var faceDetectorView = new FaceDetectorView();
			this.changeView(faceDetectorView);
		},

		changeView: function(view) {
			if (this.currentView) {
				this.currentView.destroy();
			}

			this.currentView = view;
			this.currentView.render();
		},
	});

	return router;
});