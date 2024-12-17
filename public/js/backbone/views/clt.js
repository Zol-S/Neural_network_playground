define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/clt.html',
	'd3',
	'bootstrap'
], function ($, _, Backbone, similarTemplate, d3) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		isChartInitialized: false,
		events: {
			'change #distribution-selector': 'onDistributionSelected',
			'click #start_btn': 'onStartClicked'
		},
		initialize: function() {
		},
		render: function() {
			this.$el.empty();

			var template = _.template(similarTemplate);
			this.$el.append(template());

			//this.onDistributionSelected();
		},
		randomExponential: function(rate = 5) {
			return -Math.log(Math.random())/rate;
		},
		randomWeibull: function(k = 2.75, lambda = 1.0) {
			let x = Math.random();
			return (k / lambda) * Math.pow(x / lambda, k - 1) * Math.exp(-Math.pow(x / lambda, k));
		},
		initializeChart() {
			let margin = {top: 10, right: 30, bottom: 30, left: 40};
			this.width = 460 - margin.left - margin.right,
			this.height = 400 - margin.top - margin.bottom;

			this.svg = d3.select("#chart")
				.append("svg")
				.attr("width", this.width + margin.left + margin.right)
				.attr("height", this.height + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			this.x = d3.scaleLinear()
				.domain([0, 0.9999999]) // d3.max(data, function(d) { return +d })
				.range([0, this.width]);

			this.xAxis = this.svg.append("g")
				.attr("transform", "translate(0," + this.height + ")")
				.call(d3.axisBottom(this.x));

			this.y = d3.scaleLinear()
				.range([this.height, 0]);
			this.yAxis = this.svg.append("g");
		},
		// https://d3-graph-gallery.com/graph/histogram_binSize.html
		onDistributionSelected: function() {
			this.sample = [];
			let distribution_func;

			switch ($("#distribution-selector").find(":selected").val()) {
				case 'uniform':
						distribution_func = Math.random;
					break;
				case 'exponential':
						distribution_func = this.randomExponential;
					break;
				case 'weibull':
						distribution_func = this.randomWeibull;
					break;
			}

			for (let i=0;i<100_000;i++) {
				this.sample.push(distribution_func());
			}

			// Chart initialization
			if (!this.isChartInitialized) {
				this.initializeChart();
				this.isChartInitialized = true;
			}

			// Drawing the chart
			let histogram = d3.histogram()
				.value(function(d) { return d; })
				.domain(this.x.domain())
				.thresholds(this.x.ticks(100));

			let bins = histogram(this.sample);
			this.y.domain([0, d3.max(bins, function(d) { return d.length; })]);
			this.yAxis
				.transition()
				.duration(500)
				.call(d3.axisLeft(this.y));

			let bar = this.svg
				.selectAll("rect")
				.data(bins);

			let self = this;
			bar.enter()
				.append("rect")
				.attr("x", 1)
				.attr("transform", function(d) { return "translate(" + self.x(d.x0) + "," + self.y(d.length) + ")"; })
				.attr("width", function(d) { return self.x(d.x1) - self.x(d.x0) - 1; })
				.attr("height", function(d) { return self.height - self.y(d.length); })
				.style("fill", "#69b3a2");

			bar.transition()
				.duration(500)
				.attr("x", 1)
				.attr("transform", function(d) { return "translate(" + self.x(d.x0) + "," + self.y(d.length) + ")"; })
				.attr("width", function(d) { return self.x(d.x1) - self.x(d.x0) - 1; })
				.attr("height", function(d) { return self.height - self.y(d.length); });

			bar.exit().remove();
		},
		getSampleFromArray: function(arr, size) {
			let shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
			while (i-- > min) {
				index = Math.floor((i + 1) * Math.random());
				temp = shuffled[index];
				shuffled[index] = shuffled[i];
				shuffled[i] = temp;
			}
			return shuffled.slice(min);
		},
		calculateMean: function(arr) {
			return arr.reduce((a, b) => a + b) / arr.length;
		},
		onStartClicked: function() {
			let mean_of_drawn_samples = [];

			for (let i=0;i<$("#number_of_samples").val();i++) {
				mean_of_drawn_samples.push(
					this.calculateMean(
						this.getSampleFromArray(this.sample, $("#number_of_items_within_samples").val())
					)
				);
			}

			let margin = {top: 10, right: 30, bottom: 30, left: 40},
				width = 460 - margin.left - margin.right,
				height = 400 - margin.top - margin.bottom;

			let svg = d3.select("#output_chart")
				.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			let x = d3.scaleLinear()
				.domain([0, 1])
				.range([0, width]);

			let xAxis = svg.append("g")
				.attr("transform", "translate(0," + height + ")")
				.call(d3.axisBottom(x));

			let y = d3.scaleLinear()
				.range([height, 0]);
			let yAxis = svg.append("g");

			let histogram = d3.histogram()
				.value(function(d) { return d; })
				.domain(x.domain())
				.thresholds(x.ticks(100));

			let bins = histogram(mean_of_drawn_samples);
			y.domain([0, d3.max(bins, function(d) { return d.length; })]);
			yAxis
				.transition()
				.duration(500)
				.call(d3.axisLeft(y));

			let bar = svg
				.selectAll("rect")
				.data(bins);

			bar.enter()
				.append("rect")
				.attr("x", 1)
				.attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; })
				.attr("width", function(d) { return d3.max([0, x(d.x1) - x(d.x0)-1]); })
				.attr("height", function(d) { return height - y(d.length); })
				.style("fill", "#69b3a2");

			let h = [];
			bins.forEach(function(currentValue, index, arr) {
				h.push(currentValue.length);
			});
			console.log(h);
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