define([
	'jquery',
	'backbonejs',
	'backbone/views/main'
], function ($, Backbone, MainView) {
	'use strict';

	var router = Backbone.Router.extend({
		routes: {
			'*default': 'main'
		},

		// Routes
		main: function() {
			var mainView = new MainView();
			mainView.render();
		}
	});

	return router;
});