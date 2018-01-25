define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/backpropagate.html',
	'OR_network',
	'd3',
	'bootstrap'
], function ($, _, Backbone, backpropagateTemplate, OR_network, d3) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		initialize: function() {
			this.ON = new OR_network();
			this.chartWidth = 0;
			this.chartheight = 0;
		},
		events: {
			'click #forward_btn': 'onForwardClicked',
			'click #backward_btn': 'onBackwardClicked',
			'click #mse_btn': 'onMSEClicked',
			'click #train_btn': 'onTrainClicked',
		},
		render: function() {
			this.$el.empty();

			var template = _.template(backpropagateTemplate);
			this.$el.append(template());

			this.drawChart();
		},
		onForwardClicked: function() {
			this.ON.forward($('#input_1').val(), $('#input_2').val());
			$('#output').val(this.ON.getOutput());
			//console.log($('input[name=gate_type]:checked').attr('id'));
		},
		onBackwardClicked: function() {
			this.ON.backward();
			console.log('MSE: ' + this.ON.MSE());
		},
		onMSEClicked: function() {
			console.log('MSE: ' + this.ON.MSE());
		},
		onTrainClicked: function() {
			this.chartData = [];
			this.iter = 0;
			this.mse = 1;
			this.startTime = Date.now();

			this.iteration();
		},
		iteration: function() {
			this.ON.backward();
			this.mse = this.ON.MSE();
			$('#mse').val(this.mse);
			//console.log(this.iter + '. MSE: ' + this.mse);
			this.iter++;

			this.chartData.push({
				time: (Date.now() - this.startTime),
				value: this.mse
			});

			if (this.mse > $('#mse_threshold').val()) {
				this.updateChart(this.chartData);

				var _self = this;
				setTimeout(function() {
					_self.iteration()
				}, 2);
			} else {
				console.log('Finished after ' + this.iter + ' iterations.');
			}
		},
		updateChart: function(data) {
			var line_x = d3.scaleLinear()
				.rangeRound([0, this.chartWidth])
				.domain(d3.extent(data, function(d) { return d.time; }));
			var line_y = d3.scaleLinear()
				.rangeRound([this.chartHeight, 0])
				.domain(d3.extent(data, function(d) { return d.value; }));

			var valueline = d3.line()
				.x(function(d) {
					return line_x(d.time);
				})
				.y(function(d) {
					return line_y(d.value);
				});

			// Axes
			d3.select("svg").select(".x_axis")
				.call(d3.axisBottom(line_x));
			d3.select("svg").select(".y_axis")
				.call(d3.axisLeft(line_y));

			d3.selectAll("path.line")
				.datum(data)
				.attr("class", "line")
				.attr("fill", "none")
				.attr("stroke", "steelblue")
				.attr("stroke-linejoin", "round")
				.attr("stroke-linecap", "round")
				.attr("stroke-width", 1.5)
				.attr("d", valueline);
		},
		drawChart: function(data) {
			var margin = {top: 20, right: 20, bottom: 30, left: 50},
				svg = d3.select("svg"),
				g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			this.chartWidth = +svg.attr("width") - margin.left - margin.right;
			this.chartHeight = +svg.attr("height") - margin.top - margin.bottom;

			g.append("path").attr("class", "line");

			g.append("g")
				.attr("transform", "translate(0," + this.chartHeight + ")")
				.attr("class", "x_axis")
				//.call(d3.axisBottom(x))
				.append("text")
				.attr("fill", "#000")
				.attr("transform", "rotate(0)")
				.attr("y", -5)
				.attr("x", this.chartWidth)
				.attr("text-anchor", "end")
				.text("Time (msec)");

			g.append("g")
				.attr("class", "y_axis")
				//.call(d3.axisLeft(y))
				.append("text")
				.attr("fill", "#000")
				.attr("transform", "rotate(-90)")
				.attr("y", 6)
				.attr("dy", "0.71em")
				.attr("text-anchor", "end")
				.text("Accuracy (%)");
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