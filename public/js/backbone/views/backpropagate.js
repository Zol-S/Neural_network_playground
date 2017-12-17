define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/backpropagate.html',
	'd3',
	'network',
	'bootstrap'
], function ($, _, Backbone, backpropagateTemplate, d3, network) {
	'use strict';

	var backpropagateView = Backbone.View.extend({
		el: '#main',
		initialize: function() {
		},
		events: {
			'click #train_btn': 'train'
		},
		render: function() {
			this.$el.empty();

			var template = _.template(backpropagateTemplate);
			this.$el.append(template());

			this.train();
		},
		train: function(init) {
			var a = new network();
			a.initialize([2,2,1]);
			a.train([[0,0], [0,1], [1,0], [1,1]], [[0], [1], [1], [0]]);

			console.log(a.input([0,0])[0]);
			console.log(a.input([1,0])[0]);
			console.log(a.input([0,1])[0]);
			console.log(a.input([1,1])[0]);
		},
		destroy: function() {
			this.undelegateEvents();
			this.$el.empty();
			this.stopListening();
			return this;
		}
	});

	return backpropagateView;
});