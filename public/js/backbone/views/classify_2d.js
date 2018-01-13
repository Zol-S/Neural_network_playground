define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/classify_2d.html',
	'colorbrewer',
	'synaptic',
	'bootstrap'
], function ($, _, Backbone, classify2DTemplate, colorbrewer, synaptic) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		colorbrewer_palette: ['Reds', 'Blues', 'Greens', 'Oranges', 'Purples', 'Greys'],
		events: {
			'click #generate_btn': 'onGenerateClicked',
			'click #train_btn': 'onTrainClicked'
		},
		initialize: function() {
			this.map_width = 40;
			this.map_height = 40;
			this.cluster_array = [];
		},
		render: function() {
			this.$el.empty();

			var template = _.template(classify2DTemplate);
			this.$el.append(template());

			this.drawMap();
		},
		drawMap: function() {
			$('#canvas').empty();

			for (var i=0;i<this.map_width;i++) {
				for (var k=0;k<this.map_height;k++) {
					$('#canvas').append('<div id="rect_' + k + '_' + i + '" class="small_rectangle" style="top:' + (k*10) + 'px;left:' + (i*10) + 'px;"></div>');
				}
			}
		},
		onGenerateClicked: function() {
			this.drawMap();

			var number_clusters = $('#no_clusters').val(), cluster_members = $('#no_members').val(), max_distance = $('#max_distance').val();
			this.cluster_array = [];

			// Cluster centers
			for (var i=0;i<number_clusters;i++) {
				var cx = Math.floor(Math.random()*this.map_width), cy = Math.floor(Math.random()*this.map_height);
				this.cluster_array.push({
					cluster: i,
					x: cx,
					y: cy
				});

				// Cluster members
				for (var k=0;k<cluster_members;k++) {
					var dx = cx + Math.floor(Math.random()*max_distance*2-max_distance), dy = cy + Math.floor(Math.random()*max_distance*2-max_distance);
					if (dx > this.map_width) {dx = this.map_width;}
					if (dx < 0) {dx = 0;}
					if (dy > this.map_height) {dy = this.map_height;}
					if (dy < 0) {dy = 0;}

					this.cluster_array.push({
						cluster: i,
						x: dx,
						y: dy
					});
				}
			}

			this.drawClusters();
		},
		onTrainClicked: function() {
			var number_clusters = $('#no_clusters').val();
			this.perceptron = new synaptic.Architect.Perceptron(2, 2, number_clusters);
			var trainer = new synaptic.Trainer(this.perceptron);

			var trainingSet = [];
			for (var i=0;i<this.cluster_array.length;i++) {
				trainingSet.push({
					input: [this.cluster_array[i].x/this.map_width, this.cluster_array[i].y/this.map_height],
					output: this.createOutputArray(this.cluster_array[i].cluster, number_clusters)
				});
			}

			var _self = this;
			trainer.trainAsync(trainingSet, {
				rate: .1,
				iterations: 20000,
				error: .005,
				// shuffle: true, log: 1000, cost: synaptic.Trainer.cost.CROSS_ENTROPY
			}).then(function(results) {
				console.log('Finished training', results);
				_self.colorizeMap();
				//console.log(_self.perceptron.toJSON());
			});
		},
		colorizeMap: function() {
			for (var i=0;i<this.map_width;i++) {
				for (var k=0;k<this.map_height;k++) {
					var pred_dummy = this.perceptron.activate([i/this.map_width, k/this.map_height]);
					var pred = Math.round(pred_dummy[0]) + Math.round(pred_dummy[1])*2 + Math.round(pred_dummy[2])*3;
					if (--pred<0) {pred=0;}

					if (!$('#rect_' + i + '_' + k).attr('center')) {
						$('#rect_' + i + '_' + k)
							.css('background-color', colorbrewer[this.colorbrewer_palette[pred]][4][1]);
					}
				}
			}
		},
		drawClusters: function() {
			for (var i=0;i<this.cluster_array.length;i++) {
				$('#rect_' + this.cluster_array[i].x + '_' + this.cluster_array[i].y)
					.css('background-color', colorbrewer[this.colorbrewer_palette[this.cluster_array[i].cluster]][4][3])
					.attr('center', true);
			}
		},
		createOutputArray: function(pos, len) {
			var d = new Array(len);
			for (var i=0;i<len;i++) {
				if (i==pos) {
					d[i]=1;
				} else {
					d[i]=0;
				}
			}
			return d;
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