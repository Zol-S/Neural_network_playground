'use strict';

require.config({
	paths: {
		jquery: 'vendor/jquery-3.2.1.min',
		//bootstrap: 'vendor/bootstrap-4.0.0.beta.min',
		bootstrap: 'vendor/bootstrap-5.0.2.bundle.min',
		underscore: 'vendor/underscore-1.8.3.min',
		backbonejs: 'vendor/backbone-1.1.2.min',
		text: 'vendor/require_text-2.0.12',
		json: 'vendor/require_json-0.4.0',
		mathjs: 'vendor/math-3.17.0.min',
		d3: 'vendor/d3.v4.min',
		mathjs: 'vendor/math-3.17.0.min',
		XOR_network: 'neural/XOR_network',
		OR_network: 'neural/OR_network',
		perceptron: 'neural/perceptron',
		colorbrewer: 'vendor/colorbrewer-1.0.0.min',
		synaptic: 'vendor/synaptic-1.1.4.min',
		numeric: 'vendor/numeric-1.2.6.min',
		tfjs174: 'vendor/tfjs-1.7.4.min',
		tfjs270: 'vendor/tfjs-2.7.0.min',
		tfjs3110: 'vendor/tfjs-3.11.0.min',
		tfjs4220: 'vendor/tfjs-4.22.0.min',
		heatmap: 'vendor/heatmap-2.0.5.min',
		random_sampler: 'tfjs_layer_random_sampler'
	},
	shim: {
		jquery: {
			exports: '$'
		},
		underscore: {
			exports: '_'
		},
		backbone: {
			deps: [
				'underscore',
				'jquery'
			],
			exports: 'Backbone'
		},
		bootstrap: {
			deps: [
				'jquery'
			]
		},
		XOR_network: {
			deps: [
				'perceptron'
			]
		},
		colorbrewer: {
			exports: 'colorbrewer'
		},
		numeric: {
			exports: 'numeric'
		},
		random_sampler: {
			deps: [
				'tfjs270'
			]
		},
		bootstrap_dropdown: {
			deps: [
				'bootstrap'
			]
		}
	}
});

require([
	'jquery',
	'underscore',
	'backbonejs',
	'backbone/routers/index'
], function ($, _, Backbone, Router) {
	new Router();
	Backbone.history.start();

	Backbone.View.prototype.eventAggregator = _.extend({}, Backbone.Events);
});