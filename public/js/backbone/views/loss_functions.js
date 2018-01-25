define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/loss_functions.html',
	'd3',
	'bootstrap'
], function ($, _, Backbone, lossFunctionsTemplate, d3) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		events: {
			'click #ng_btn': 'onNGClicked',
			'click #sgd_btn': 'onSGDClicked',
			'click #regenerate_btn': 'onRegenerateClicked'
		},
		initialize: function() {
			this.gradient = [];

			this.margin = {top: 20, right: 20, bottom: 50, left: 50};
			this.width = 600 - this.margin.left - this.margin.right,
			this.height = 600 - this.margin.top - this.margin.bottom;
			this.axis_x = d3.scaleLinear().range([0, this.width]);
			this.axis_y = d3.scaleLinear().range([this.height, 0]);
			this.axis_step = 0.5;

			var _self = this;
			this.valueline_curvy = d3.line()
				.x(function(d) { return _self.axis_x(d.x); })
				.y(function(d) { return _self.axis_y(d.y); })
				.curve(d3.curveCardinal);
		},
		render: function() {
			this.$el.empty();

			var template = _.template(lossFunctionsTemplate);
			this.$el.append(template({
				base_url: window.base_url,
				public_directory: window.public_directory
			}));

			this.initializeChart();
			this.generateParameters();
			this.drawChart();
		},
		calculateFunction: function(x) {
			return this.parameter_x4*Math.pow(x, 4) - this.parameter_x3*Math.pow(x, 3);
		},
		onRegenerateClicked: function() {
			this.generateParameters();
			this.drawChart();
		},
		generateParameters: function() {
			this.parameter_x4 = parseInt(Math.random()*500)/100;
			this.parameter_x3 = parseInt(Math.random()*500+500)/100;

			$('#function').html('<i>f(x) = ' + this.parameter_x4 + 'x<sup>4</sup> - ' + this.parameter_x3 + 'x<sup>3</sup></i>');
		},
		initializeChart() {
			this.svg = d3.select("svg")
				.attr("width", this.width + this.margin.left + this.margin.right)
				.attr("height", this.height + this.margin.top + this.margin.bottom)
				.append("g")
				.attr("transform",
					"translate(" + this.margin.left + "," + this.margin.top + ")");

			// Paths
			this.svg.append("path")
				.attr("class", "line");

			this.svg.append("path")
				.attr("class", "line_red");

			// Axes
			this.svg.append("g")
				.attr("transform", "translate(0," + this.height + ")")
				.attr("class", "axis_x")
				.call(d3.axisBottom(this.axis_x));

			this.svg.append("g")
				.attr("class", "axis_y")
				.call(d3.axisLeft(this.axis_y));

			// Legen
			this.svg.append("text")
				.attr("transform",
						"translate(" + (this.width/2) + " ," + 
									(this.height + this.margin.top + 20) + ")")
				.style("text-anchor", "middle")
				.text("x");

			this.svg.append("text")
				.attr("transform", "rotate(-90)")
				.attr("y", 0 - this.margin.left)
				.attr("x",0 - (this.height / 2))
				.attr("dy", "1em")
				.style("text-anchor", "middle")
				.text("y");
		},
		drawChart: function() {
			// Generate function data
			var data = [];
			for (var i=-2;i<4;i+=this.axis_step) {
				data.push({
					x: i,
					y: this.calculateFunction(i)
				});
			}

			// (Re)draw function
			this.axis_x.domain(d3.extent(data, function(d) { return d.x; }));
			this.axis_y.domain(d3.extent(data, function(d) { return d.y; }));

			this.svg.select(".axis_x")
				.call(d3.axisBottom(this.axis_x));

			this.svg.select(".axis_y")
				.transition()
				.ease(d3.easeExpInOut)
				.duration(1000)
				.call(d3.axisLeft(this.axis_y));

			this.svg.select(".line")
				.data([data])
				.transition()
				.ease(d3.easeExpInOut)
				.duration(250)
				.attr("d", this.valueline_curvy);

			// Clear gradient lines
			this.svg.select(".line_red")
				.attr("d", "");
			$('#start').val(-2);
		},
		numericalGradient: function(x) {
			var eps = 0.05;
			return (this.calculateFunction(x+eps)-this.calculateFunction(x-eps))/2*eps;
		},
		onNGClicked: function() {
			var grad = this.numericalGradient(parseFloat($('#start').val()));
			$('#gradient').val(parseInt(grad*100)/100);
		},
		onSGDClicked: function() {
			var x = parseFloat($('#start').val());
			if (this.gradient.length == 0) {
				this.gradient = [{
					x: x,
					y: this.calculateFunction(x)
				}];
			}

			var step_length = parseFloat($('#step_length').val());
			var max_steps = parseFloat($('#max_steps').val());
			var min = this.gradientDescent(step_length, max_steps, x);
			console.log('Minimum: ' + min + ' => ' + this.calculateFunction(min));
			this.gradient.push({
				x: min,
				y: this.calculateFunction(min)
			});

			$('#start').val(min);
			this.drawLine(this.gradient);
		},
		gradientDescent: function(step_length, max_steps, initial_point) {
			var w_min = initial_point, g_min = this.calculateFunction(initial_point), w_prev = initial_point;
			for (var k=0;k<max_steps;k++) {
				var w = w_prev - step_length*this.numericalGradient(w_prev);
				if (this.calculateFunction(w) < g_min) {
					w_min = w;
					g_min = this.calculateFunction(w);
				}
				w_prev = w;
			}

			return w_min;
		},
		drawLine: function(data) {
			var _self = this;
			this.svg.select(".line_red")
				.data([data])
				.attr("d", d3.line()
					.x(function(d) { return _self.axis_x(d.x); })
					.y(function(d) { return _self.axis_y(d.y); })
				);
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