define([
	'jquery',
	'backbonejs',
	'backbone/views/backpropagate',
	'backbone/views/xor',
	'backbone/views/neighbor'
], function ($, Backbone, BackpropagateView, XorView, NeighborView) {
	'use strict';

	var router = Backbone.Router.extend({
		routes: {
			'backpropagate': 'backpropagate',
			'xor': 'xor',
			'neighbor': 'neighbor',
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