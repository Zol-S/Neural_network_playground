define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/clustering.html',
	'd3',
	'bootstrap'
], function ($, _, Backbone, similarTemplate, d3) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		events: {
			'click #start_btn': 'onStartClicked',
			'click #generate_btn': 'onGenerateClicked',
			'click #step_btn': 'onStepClicked',
			'change #cluster_type': 'onClusterTypeChanged',
			'change #data_type': 'onDataTypeChanged',
			'click #cleat_log_btn': 'onLogClearClicked'
		},
		initialize: function() {
			this.width = 600;
			this.height = 600;
			this.padding = 10;
			this.colorize = d3.scaleOrdinal(d3.schemeCategory10);
			this.counter = 0;
			this.isFinished = false;

			this.nodes = [];
			this.centers = [];
		},
		render: function() {
			this.$el.empty();

			var template = _.template(similarTemplate);
			this.$el.append(template());
		},
		destroy: function() {
			this.undelegateEvents();
			this.$el.empty();
			this.stopListening();
			return this;
		},

		// Event handlers
		onDataTypeChanged: function(e) {
			// Number of clusters
			switch($(e.target).val()) {
				case 'smiley':
				case 'random':
						$('#data_cluster_number').attr('disabled', 'disabled');
					break;
				case 'circular':
				case 'clusters':
				case 'tangential':
						$('#data_cluster_number').removeAttr('disabled');
			}
		},
		onClusterTypeChanged: function(e) {
			switch($(e.target).val()) {
				case 'k-means':
						$('#cluster_cluster_number').removeAttr('disabled');
						$('#epsilon').attr('disabled', 'disabled');
						$('#min_points').attr('disabled', 'disabled');
					break;
				case 'mean_shift_clustering':
						$('#cluster_cluster_number').attr('disabled', 'disabled');
						$('#epsilon').attr('disabled', 'disabled');
						$('#min_points').attr('disabled', 'disabled');
					break;
				case 'dbscan':
						$('#cluster_cluster_number').attr('disabled', 'disabled');
						$('#epsilon').removeAttr('disabled');
						$('#min_points').removeAttr('disabled');
					break;
			}
		},
		onLogClearClicked: function() {
			$('#log').empty();
		},
		onGenerateClicked: function() {
			// Initialize
			$('#step_btn').attr('disabled', 'disabled');
			$('#start_btn').removeAttr('disabled');
			$('#right_pane').empty();
			$('#stage').empty();
			this.counter = 0;
			this.nodes =  [];
			this.isFinished = false;
			this.centers = [];

			var cardinality = $('#data_cardinality').val(), cluster_number = $('#data_cluster_number').val(), cluster_elements = Math.ceil(cardinality/cluster_number), _self = this;

			switch($('#data_type').val()) {
				case 'random':
						this.nodes = d3.range(cardinality).map(function() { return {
							cluster: 0,
							x: Math.floor(Math.random()*(_self.width-2*_self.padding)+_self.padding),
							y: Math.floor(Math.random()*(_self.height-2*_self.padding)+_self.padding)
						};
					});
					break;
				case 'smiley':
					for (let i=0;i<cardinality;i++) {
						// Left eye
						if (i < cardinality*0.05) {
							cx = Math.floor(_self.width*0.4+Math.random()*_self.padding*2-_self.padding/2);
							cy = Math.floor(_self.height*0.405+Math.random()*_self.padding*2-_self.padding/2);
						}

						// Right eye
						if (cardinality*0.05 <= i && i < cardinality*0.1) {
							cx = Math.floor(_self.width*0.6+Math.random()*_self.padding*2-_self.padding/2);
							cy = Math.floor(_self.height*0.405+Math.random()*_self.padding*2-_self.padding/2);
						}

						// Mouth
						if (cardinality*0.1 <= i && i < cardinality*0.3) {
							cx = Math.floor(_self.width*0.6+Math.random()*_self.padding*10-_self.padding*10);
							cy = Math.floor(_self.height*0.6+Math.random()*_self.padding*2-_self.padding/2);
						}
						// Head
						if (cardinality*0.3 <= i && i < cardinality*0.95) {
							const radius = 150;
							let alpha = 2 * Math.PI * Math.random();

							cx = Math.floor(radius * Math.cos(alpha) + Math.random()*20 + _self.width*0.5);
							cy = Math.floor(radius * Math.sin(alpha) + Math.random()*20 + _self.height*0.5);
						}

						if (cardinality*0.95 <= i) {
							cx = Math.floor(Math.random()*(_self.width-2*_self.padding)+_self.padding);
							cy = Math.floor(Math.random()*(_self.height-2*_self.padding)+_self.padding);
						}

						this.nodes.push({
							cluster: 0,
							x: cx,
							y: cy
						});
					}

					break;
				case 'clusters':
						var spread = 150, cx, cy;
						for (var i=0;i<cardinality;i++) {
							if (i%cluster_elements == 0) {
								cx = Math.floor(Math.random()*(this.width-2*this.padding)+this.padding);
								cy = Math.floor(Math.random()*(this.height-2*this.padding)+this.padding);
								var dx = cx, dy = cy;
							} else {
								dx = cx + Math.floor(Math.random()*spread-(spread/2));
								dy = cy + Math.floor(Math.random()*spread-(spread/2));
								if (dx < 0) {dx = this.padding;}
								if (dx > this.width) {dx = this.width-this.padding;}
								if (dy < 0) {dy = this.padding;}
								if (dy > this.height) {dy = this.height-this.padding;}
							}

							this.nodes.push({
								cluster: i%cluster_elements,
								x: dx,
								y: dy
							});
						}
					break;
				case 'circular':
						var r = Math.floor((this.height<this.width?this.height/2-this.padding:this.width/2-this.padding)/cluster_number);

						for (var i=0;i<cardinality;i++) {
							var theta = Math.random()*360;
							dx = this.width/2 + (i%cluster_number + 1)*r*Math.cos(theta);
							dy = this.height/2 + (i%cluster_number + 1)*r*Math.sin(theta);

							this.nodes.push({
								cluster: i%cluster_number,
								x: dx,
								y: dy
							});
						}
					break;
				case 'tangential':
						var part = this.height/cluster_number, magnitude = Math.floor(Math.random()*part);
						for (var i=0;i<cardinality;i++) {
							var dx = this.width*i/cardinality;
							var dy = Math.floor(Math.tan(i)*magnitude) + i%cluster_number*part + part/2;

							if (dx < 0) {dx = this.padding;}
							if (dx > this.width) {dx = this.width-this.padding;}
							if (dy < 0) {dy = this.padding;}
							if (dy > this.height) {dy = this.height-this.padding;}

							this.nodes.push({
								cluster: i%cluster_elements,
								x: dx,
								y: dy
							});
						}
					break;
			}

			var svg = d3.select("#stage").append("svg:svg")
				.attr("width", this.width)
				.attr("height", this.height);

			svg.selectAll("circle#point")
				.data(this.nodes)
				.enter()
				.append("svg:circle")
				.attr("id", "point")
				.attr("r", 5)
				.attr("cx", function(d) { return d.x;})
				.attr("cy", function(d) { return d.y;})
				.style("fill", '#BBB');
		},
		onStartClicked: function() {
			$('#step_btn').removeAttr('disabled');
			$('#start_btn').attr('disabled', 'disabled');
			var cluster_number = $('#cluster_cluster_number').val(), type = $('#cluster_type').val(), _self = this;

			switch (type) {
				case 'k-means':
						this.centers = d3.range(cluster_number).map(function(i) { return {
								cluster: i,
								x: Math.floor(Math.random()*(_self.width-2*_self.padding)+_self.padding),
								y: Math.floor(Math.random()*(_self.height-2*_self.padding)+_self.padding)
							};
						});
					break;
				case 'mean_shift_clustering':
						for (var i=0;i<this.nodes.length;i++) {
							this.centers.push({
								cluster: i,
								x: this.nodes[i].x,
								y: this.nodes[i].y
							});
						}
					break;
				case 'dbscan':
						this.epsilon = parseInt($('#epsilon').val());
						this.min_points = parseInt($('#min_points').val());

						this.current_cluster_id = 1;
						this.unvisited_points = this.shuffleArray([...Array(parseInt($('#data_cardinality').val())).keys()]);
					break;
			}

			// Draw cluster center crosses
			d3.select("#stage svg")
				.selectAll("path")
				.data(this.centers, function(d) { return d.cluster; })
				.enter()
				.append("svg:path")
				.attr("d", function(d) {
					return "M" + d.x + "," + d.y +"L" + (d.x+10) + "," + (d.y+10) + "M" + (d.x+10) + "," + d.y + "L" + d.x + "," + (d.y+10);
				})
				.attr("stroke-width", 2)
				.attr("stroke", function(d) {
					return _self.colorize(d.cluster);
				});

			switch (type) { // Generalize these functions
				case 'k-means':
					this.colorizeNodes();
					this.initializeStats();
			}
		},
		onStepClicked: function() {
			if (!this.isFinished) {
				var type = $('#cluster_type').val(), stage = d3.select("#stage svg"), isFinished = true, _self = this;
				this.counter++;

				switch (type) {
					case 'k-means':
						for (var i=0;i<this.centers.length;i++) {
							var cx = 0, cy = 0, count = 0;
							for (var k=0;k<this.nodes.length;k++) {
								if (this.nodes[k].cluster == i) {
									cx+= this.nodes[k].x;
									cy+= this.nodes[k].y;
									count++;
								}
							}

							if (this.centers[i].x != Math.floor(cx/count) && this.centers[i].y != Math.floor(cy/count)) {
								isFinished = false;
							}

							this.centers[i].x = Math.floor(cx/count);
							this.centers[i].y = Math.floor(cy/count);
						}

						break;
					case 'mean_shift_clustering':
						// http://www.chioka.in/meanshift-algorithm-for-the-rest-of-us-python/
						for (var i=0;i<this.centers.length;i++) {
							var cx_num = 0, cx_denom = 0, cy_num = 0, cy_denom = 0;
							for (var k=0;k<this.nodes.length;k++) {
								var distance = Math.sqrt(Math.pow(this.nodes[k].x - this.centers[i].x, 2) + Math.pow(this.nodes[k].y - this.centers[i].y, 2));
								if (distance < 100) {
									var weight = this.calculateGaussianKernel(distance, 100);
									cx_num+= weight*this.nodes[k].x;
									cx_denom+= weight;
									cy_num+= weight*this.nodes[k].y;
									cy_denom+= weight;
								}
							}

							if (this.centers[i].x != Math.floor(cx_num/cx_denom) && this.centers[i].y != Math.floor(cy_num/cy_denom)) {
								isFinished = false;
							}

							this.centers[i].x = Math.floor(cx_num/cx_denom);
							this.centers[i].y = Math.floor(cy_num/cy_denom);

							// Remove duplicates
							this.getUniqueCenters();
						}
						break;
					case 'dbscan':
							// https://www.kdnuggets.com/2022/08/implementing-dbscan-python.html
							// 1) Randomly selecting any point p. It is also called core point if there are more data points than minPts in a neighborhood. 
							// 2) It will use eps and minPts to identify all density reachable points.
							// 3) It will create a cluster using eps and minPts if p is a core point. 
							// 4) It will move to the next data point if p is a border point. A data point is called a border point if it has fewer points than minPts in the neighborhood. 
							// 5) The algorithm will continue until all points are visited.
							let current_point_id = this.unvisited_points[0];

							// Drawing a circle around the current point
							d3.select("#stage svg #dbscan_circle").remove();

							d3.select("#stage svg")
							    .append("circle")
							    .attr("id", "dbscan_circle")
							    .style("stroke", "red")
							    .style("fill", "transparent")
							    .attr("r", this.epsilon)
							    .attr("cx", this.nodes[current_point_id].x)
							    .attr("cy", this.nodes[current_point_id].y);

							// Checking the current point's vicinity
							this.current_cluster_ids = [];
							this.discoverCluster(current_point_id);
							this.current_cluster_ids = this.current_cluster_ids.filter((value, index, array) => array.indexOf(value) === index);

							if (this.current_cluster_ids.length >= this.min_points) {
								for (let k in this.current_cluster_ids) {
									this.nodes[this.current_cluster_ids[k]].cluster = this.current_cluster_id;
								}
							}
							
							// Removing points from unvisited array
							for (let i in this.current_cluster_ids) {
								const index = this.unvisited_points.indexOf(this.current_cluster_ids[i]);
								if (index > -1) {
							  		this.unvisited_points.splice(index, 1);
								}
							}
							this.current_cluster_id += 1;

							// Recolor points
							let _self = this;
							d3.select("#stage svg").selectAll("circle#point")
								.filter(function(d) {
									return d.cluster > 0
								})
								.style("fill", function(d, i) {
									return _self.colorize(d.cluster);
								});

							if (this.unvisited_points.length > 0) {
								isFinished = false;
							}
						break;
				}

				switch (type) {
					case 'k-means':
						this.colorizeNodes();
						this.updateStats();
					case 'mean_shift_clustering':
							let crosses = stage.selectAll("path").data(this.centers, function(d) { return d.cluster; });
							crosses.exit().remove();

							crosses.transition()
								.duration(500)
								.attr("d", function(d) {
									return "M" + d.x + "," + d.y +"L" + (d.x+10) + "," + (d.y+10) + "M" + (d.x+10) + "," + d.y + "L" + d.x + "," + (d.y+10);
								});
						break;
				}

				// Log
				if (isFinished) {
					if (type == 'mean_shift_clustering') {
						this.colorizeNodes();
						this.initializeStats();
					}

					let dt = new Date(), log_string = 'Cluster centers are found after';
					if (type == 'dbscan') {
						log_string = 'Clusters are found after'
					}

					$('#log').append(dt.getFullYear() + "/" + (dt.getMonth()>9?"":"0") + dt.getMonth() + "/" + (dt.getDay()>9?"":"0") + dt.getDay() + " " + (dt.getHours()>9?"":"0") + dt.getHours() + ":" + (dt.getMinutes()>9?"":"0") + dt.getMinutes() + ":" + (dt.getSeconds()>9?"":"0") + dt.getSeconds() + ' - ' + log_string + ' ' + this.counter + ' steps\n');

					this.isFinished = true;
				}
			}
		},
		colorizeNodes: function() {
			var _self = this;

			// Put nodes into clusters
			d3.select("#stage svg").selectAll("circle#point")
				.style("fill", function(d, i) {
					return _self.colorize(_self.getClosestClusterCenter(d, i));
				});
		},

		// Algorithm helpers
		discoverCluster: function(current_point_id) {
			/*
			 * Discover all points of the cluster
			 * Return all the points within cluster
			 */
			let point_ids_in_vicinity_list = [];
			for (let k=0;k<this.nodes.length;k++) {
				let distance = Math.sqrt(Math.pow(this.nodes[k].x - this.nodes[current_point_id].x, 2) + Math.pow(this.nodes[k].y - this.nodes[current_point_id].y, 2));

				if (
						(distance <= this.epsilon) && 
						(!point_ids_in_vicinity_list.includes(k))
				) {
					point_ids_in_vicinity_list.push(k);
				}
			}

			for (let i in point_ids_in_vicinity_list) {
				if (!this.current_cluster_ids.includes(point_ids_in_vicinity_list[i])) {
					this.current_cluster_ids.push(point_ids_in_vicinity_list[i]);
					if (current_point_id != point_ids_in_vicinity_list[i]) {
						this.discoverCluster(point_ids_in_vicinity_list[i]);
					}
				}
			}
		},
		shuffleArray: function(arr) {
		    if (arr.length === 1) {return arr};
		    const rand = Math.floor(Math.random() * arr.length);
		    return [arr[rand], ...this.shuffleArray(arr.filter((_, i) => i != rand))];
		},
		getClosestClusterCenter: function(node, k) {
			var closestClusterCenter = {
				cluster: 0,
				distance: (this.width>this.height?this.width:this.height)
			};

			for (var i=0;i<this.centers.length;i++) {
				var distance = Math.sqrt(Math.pow(this.centers[i].x - node.x, 2) + Math.pow(this.centers[i].y - node.y, 2));
				if (distance < closestClusterCenter.distance) {
					closestClusterCenter.cluster = i;
					closestClusterCenter.distance = distance;
				}
			}

			this.nodes[k].cluster = closestClusterCenter.cluster;
			return closestClusterCenter.cluster;
		},
		calculateGaussianKernel: function(distance, bandwidth) {
			return (1/bandwidth*Math.sqrt(2*Math.PI))*Math.exp(-0.5*Math.pow((distance/bandwidth), 2));
		},
		getUniqueCenters: function() {
			var output = [], threshold = 10;

			for (var i=0;i<this.centers.length;i++) {
				var isUnique = true;
				for (var k=0;k<output.length;k++) {
					if (Math.abs(this.centers[i].x - output[k].x) < threshold && Math.abs(this.centers[i].y - output[k].y) < threshold) {
						isUnique = false;
					}
				}

				if (isUnique) {
					output.push(this.centers[i]);
				}
			}

			this.centers = output;
		},

		// Statistics
		initializeStats: function() {
			var data = [], cluster_number = $('#cluster_cluster_number').val(), cardinality = $('#data_cardinality').val(), _self = this;

			for (var i=0;i<cluster_number;i++){
				data.push(0);
			}

			for (var i=0;i<this.nodes.length;i++) {
				data[this.nodes[i].cluster]++;
			}

			var margin = {top: 20, right: 20, bottom: 70, left: 40};
			this.statWidth = 200 - margin.left - margin.right,
			this.statHeight = 200 - margin.top - margin.bottom;

			var svg = d3.select("#right_pane").append("svg")
				.attr("width", this.statWidth + margin.left + margin.right)
				.attr("height", this.statHeight + margin.top + margin.bottom)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			var x = d3.scaleBand().rangeRound([0, this.statWidth]).padding(0.1),
				y = d3.scaleLinear().rangeRound([this.statHeight, 0]);

			var bandScale = d3.scaleBand()
				.domain(data)
				.range([0, 200])
				.paddingInner(0.05);

			svg.selectAll('rect')
				.data(data)
				.enter()
				.append('rect')
				.attr('y', function(d, i) {
					return i*25;
				})
				.attr('height', 20)
				.attr('width', function(d) {
					return _self.statWidth/cardinality*d;
				})
				.attr('fill', function(d, i) {
					return _self.colorize(i);
				});

			svg.selectAll('text')
				.data(data)
				.enter()
				.append('text')
				.attr("x", -10)
				.attr("y", function(d, i) {
					return i*25+17;
				})
				.style("fill", "#000000")
				.text(function(d) {
					return d;
				})
				.attr("text-anchor", "end");
		},
		updateStats: function() {
			var data = [], cluster_number = $('#cluster_cluster_number').val(), cardinality = $('#data_cardinality').val(), _self = this;

			for (var i=0;i<cluster_number;i++){
				data.push(0);
			}

			for (var i=0;i<this.nodes.length;i++) {
				data[this.nodes[i].cluster]++;
			}

			d3.select("#right_pane svg")
				.selectAll('rect')
				.data(data)
				.transition()
				.duration(500)
				.attr('width', function(d) {
					return _self.statWidth/cardinality*d;
				});

			d3.select("#right_pane svg")
				.selectAll('text')
				.data(data)
				.text(function(d) {
					return d;
				});
		}
	});

	return view;
});

// division by zero