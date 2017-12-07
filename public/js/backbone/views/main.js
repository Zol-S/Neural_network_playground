define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/layout.html',
	'mathjs',
	'd3',
	'bootstrap'
], function ($, _, Backbone, layoutTemplate, math, d3) {
	'use strict';

	var mainView = Backbone.View.extend({
		el: '#main',
		events: {
			'click #submit_btn': 'onSubmitClicked'
		},
		render: function() {
			this.$el.empty();

			var template = _.template(layoutTemplate);
			this.$el.append(template());

			this.drawNeuralNetwork();
		},
		onSubmitClicked: function() {
			var input = math.matrix([[parseInt($('#input_1').val()), parseInt($('#input_2').val())]]);

			var weight1 = math.matrix([[1, 1], [1, 1]]);
			var bias1 = math.matrix([[0, -1]]);

			var weight2 = math.matrix([[1], [-2]]);

			var XW = math.multiply(input, weight1);
			var XWC = math.add(XW, bias1);

			var h = math.map(XWC, function(value) {
				if (value < 0) {
					return 0;
				}

				return value;
			});

			$('#hidden_1').val(h.toArray()[0][0]);
			$('#hidden_2').val(h.toArray()[0][1]);

			var output = math.multiply(h, weight2);
			$('#output').val(output.toArray()[0][0]);
		},
		drawNeuralNetwork: function() {
			var width = $("#stage").width(), height = 500, nodeSize = 25;
			var svg = d3.select("#stage").append("svg").attr("width", width).attr("height", height);

			var nodes = [
				{"id": 1, "label": "i1", "layer": 1},
				{"id": 2, "label": "i2", "layer": 1},
				{"id": 3, "label": "h1", "layer": 2, "bias": 0},
				{"id": 4, "label": "h2", "layer": 2, "bias": -1},
				{"id": 5, "label": "o", "layer": 3}
			];

			var links = [
				{
					'source_id': 1,
					'target_id': 3,
					'weight': 1
				},
				{
					'source_id': 1,
					'target_id': 4,
					'weight': 1
				},
				{
					'source_id': 2,
					'target_id': 3,
					'weight': 1
				},
				{
					'source_id': 2,
					'target_id': 4,
					'weight': 1
				},
				{
					'source_id': 3,
					'target_id': 5,
					'weight': 1
				},
				{
					'source_id': 4,
					'target_id': 5,
					'weight': -2
				},
			];

			var netsize = {};
			nodes.forEach(function (d) {
				if (d.layer in netsize) {
					netsize[d.layer] += 1;
				} else {
					netsize[d.layer] = 1;
				}
				d["lidx"] = netsize[d.layer];
			});

			var xDist = width / Object.keys(netsize).length;

			nodes.map(function(d) {
				var layerSize = netsize[d.layer], yDist = height / layerSize;

				d["x"] = (d.layer - 0.5) * xDist;
				d["y"] = (d.lidx - 0.5) * yDist;
			});

			var colorScaleBlue = d3.scaleLinear()
				.domain([0, 10])
				.range([d3.rgb('#F2F2FF'), d3.rgb('#0000FF')]);

			var colorScaleRed = d3.scaleLinear()
				.domain([0, 10])
				.range([d3.rgb('#FFF2F2'), d3.rgb('#FF0000')]);

			/*var div = d3.select("body").append("div")
				.attr("class", "tooltip")
				.style("opacity", 0);*/

			// Links
			links.map(function(d, i) {
				links[i].source = {
					'x': nodes.filter(function(n) { return n.id == links[i].source_id; })[0].x,
					'y': nodes.filter(function(n) { return n.id == links[i].source_id; })[0].y
				};
				links[i].target = {
					'x': nodes.filter(function(n) { return n.id == links[i].target_id; })[0].x,
					'y': nodes.filter(function(n) { return n.id == links[i].target_id; })[0].y
				};
			});

			var link = svg.selectAll('path.link')
				.data(links)
				.enter()
				.insert('path', "g")
				.attr("class", "link")
				.attr('d', function(d){
					return diagonal(d);
				})
				.style("fill", "none")
				.style("stroke-dasharray", ("10, 3"))
				.style('stroke', function(d) {
					return (d.weight>0?colorScaleRed(d.weight):colorScaleBlue(-d.weight));
				})
				.style('stroke-width', function(d) {
					return Math.sqrt(Math.abs(d.weight)) + 'px';
				})/*.on("mouseover", function(d) {
					div.transition()
						.duration(200)
						.style("opacity", .9);
					div.html(d.weight)
						.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 28) + "px");
				})
				.on("mouseout", function(d) {
					div.transition()
						.duration(500)
						.style("opacity", 0);
				})*/;

			function diagonal(d) {
				return "M" + d.source.x + "," + d.source.y
					+ "C" + (d.source.x + d.target.x) / 2 + "," + d.source.y
					+ " " + (d.source.x + d.target.x) / 2 + "," + d.target.y
					+ " " + d.target.x + "," + d.target.y;
			}

			// Nodes
			var node = svg.selectAll(".node")
				.data(nodes)
				.enter().append("g")
				.attr("transform", function(d) {
					return "translate(" + d.x + "," + d.y + ")";
				});

			var circle = node.append("circle")
				.attr("class", "node")
				.attr("r", nodeSize)
				.attr("stroke", function(d) {
					if (typeof d.bias != 'undefined') {
						if (d.bias >= 0) {
							return colorScaleRed(d.bias);
						} else {
							return colorScaleBlue(-d.bias);
						}
					}

					return "black";
				});

			node.append("text")
				.text(function(d) { return d.label; })
				.attr("id", function(d) { return "text_" + d.id; })
				.attr("text-anchor", "middle").attr("y", 5);

			// Text
			/*var textLabels = svg.append("text")
				.attr("x", 50)
				.attr("y", 80)
				.text("1 1 0 0")
				.attr("font-family", "sans-serif")
				.attr("font-size", "15px")
				.attr("fill", "red");

			var textLabels2 = svg.append("text")
				.attr("x", 50)
				.attr("y", 230)
				.text("1 0 1 0")
				.attr("font-family", "sans-serif")
				.attr("font-size", "15px")
				.attr("fill", "red");

			var weight1 = svg.append("text")
				.attr("x", 180)
				.attr("y", 70)
				.text("1")
				.attr("font-family", "sans-serif")
				.attr("font-size", "15px")
				.attr("fill", "red");

			var weight2 = svg.append("text")
				.attr("x", 180)
				.attr("y", 90)
				.text("1")
				.attr("font-family", "sans-serif")
				.attr("font-size", "15px")
				.attr("fill", "red");

			var weight3 = svg.append("text")
				.attr("x", 180)
				.attr("y", 200)
				.text("1")
				.attr("font-family", "sans-serif")
				.attr("font-size", "15px")
				.attr("fill", "red");

			var weight4 = svg.append("text")
				.attr("x", 180)
				.attr("y", 220)
				.text("1")
				.attr("font-family", "sans-serif")
				.attr("font-size", "15px")
				.attr("fill", "red");*/
		},
		destroy: function() {
			this.undelegateEvents();
			this.$el.empty();
			this.stopListening();
			return this;
		}
	});

	return mainView;
});