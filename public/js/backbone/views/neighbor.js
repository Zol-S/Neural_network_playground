define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/neighbor.html',
	'd3',
	'bootstrap'
], function ($, _, Backbone, neighborTemplate, d3) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		events: {
			'click #change_btn': 'onChangeBtnClicked',
			'click #regenerate_btn': 'onRegenerateBtnClicked'
		},
		initialize: function() {
			this.width = 300;
			this.height = 300
			this.scale = 1;
			this.num_class = 5;
			this.num_items = 3;
			this.num_neighbor = 1;
			this.color_array = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 0, 255], [0, 255, 255], [255, 255, 0], [255, 255, 255]];

			this.points = new Array();
			this.generatePoints();
		},
		render: function() {
			this.$el.empty();

			var template = _.template(neighborTemplate);
			this.$el.append(template({
				width: this.width,
				height: this.height,
				scale: this.scale
			}));

			$('#num_class').val(this.num_class);
			$('#num_items').val(this.num_items);
			$('#num_neighbor').val(this.num_neighbor);
			this.drawImage();
		},
		generatePoints: function() {
			this.points.length = 0;

			var x_dev = this.width/4;
			var y_dev = this.height/4;

			// Class centers
			for (var i = 0;i<this.num_class;i++) {
				var pos_x = Math.floor(Math.random()*this.width);
				var pos_y = Math.floor(Math.random()*this.height);

				this.points.push({
					x: pos_x,
					y: pos_y,
					class: i
				})

				for (var k = 0;k<(this.num_items-1);k++) {
					var pos_x2 = Math.floor(pos_x + Math.random()*x_dev - x_dev/2);
					var pos_y2 = Math.floor(pos_y + Math.random()*y_dev - y_dev/2);
					this.points.push({
						x: (pos_x2>0?pos_x2:0),
						y: (pos_y2>0?pos_y2:0),
						class: i
					});
				}
			}
		},
		onRegenerateBtnClicked: function() {
			this.num_class = $('#num_class').val();
			this.num_items = $('#num_items').val();
			this.num_neighbor = $('#num_neighbor').val();
			this.generatePoints();
			this.drawImage();
		},
		onChangeBtnClicked: function() {
			this.num_neighbor = $('#num_neighbor').val();
			this.drawImage();
		},
		drawImage: function() {
			$('#canvas').empty();

			var ctx = document.getElementById('canvas').getContext('2d');
			var imageData = ctx.getImageData(0, 0, this.width, this.height);

			for (var i=0;i<imageData.data.length;i+=4) {
				var x = (i/4)%this.width, y = Math.floor((i/4)/this.width);
				var closest_points = this.getClosestPoints(x, y);
				var color = this.color_array[this.majorityVote(closest_points)];

				for (var k = 0;k<4;k+=4) {
					imageData.data[i+k] = color[0];
					imageData.data[i+k+1] = color[1];
					imageData.data[i+k+2] = color[2];
					imageData.data[i+k+3] = 255;
				}
			}

			for (var i=0;i<this.points.length;i++) {
				var item = 4*this.points[i].y*this.width + 4*this.points[i].x;
				imageData.data[item] = 0;
				imageData.data[item+1] = 0;
				imageData.data[item+2] = 0;
				imageData.data[item+3] = 255;
			}

			/*ctx.scale(this.scale, this.scale);
			ctx.height = this.scale * this.height;
			ctx.width = this.scale * this.width;*/
			ctx.putImageData(imageData, 0, 0);
		},
		getClosestPoints: function(x, y) {
			var distance_array = [];

			for (var k=0;k<this.points.length;k++) {
				distance_array.push({
					distance: Math.floor(Math.sqrt(Math.pow(x-this.points[k].x, 2) + Math.pow(y-this.points[k].y, 2))),
					class: this.points[k].class,
					x: x,
					y: y
				});
			}

			distance_array.sort(function(a, b) {
				if (a.distance < b.distance) return -1;
				if (a.distance > b.distance) return 1;
				return 0;
			});

			return distance_array.slice(0, this.num_neighbor);
		},
		majorityVote: function(point_arr) {
			var votes = new Array();
			for (var i = 0;i<this.num_class;i++) {
				votes.push(0);
			}

			for (var i = 0;i<point_arr.length;i++) {
				votes[point_arr[i].class]++;
			}

			var winner_index = 0, num_votes = 0;
			for (var i = 0;i<votes.length && i < this.num_neighbor;i++) {
				if (num_votes < votes[i]) {
					num_votes = votes[i];
					winner_index = i;
				}
			}

			//console.log('First class: ' + point_arr[0].class);
			//console.log('Class of the majority vote (' + winner_index + '):' + point_arr[winner_index].class);
			return point_arr[winner_index].class;
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