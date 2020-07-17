define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/lstm.html',
	'tfjs132',
	'd3',
	'bootstrap'
], function ($, _, Backbone, lstmTemplate, tf, d3) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		input_words_counter: 3,
		sample_texts: ['Jack and Jill went up the hill\nTo fetch a pail of water\nJack fell down and broke his crown\nAnd Jill came tumbling after\nJill is clever', 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.'],
		events: {
			'click #train_btn': 'onTrainClicked',
			'click #predict_btn': 'onPredictClicked',
			'change #input_word_counter': 'onWordCounterChanged',
			'click #sample1_btn': 'onSample1Clicked',
			'click #sample2_btn': 'onSample2Clicked',
			'click #clear_btn': 'onClearClicked'
		},
		render: function() {
			this.$el.empty();

			var template = _.template(lstmTemplate);
			this.$el.append(template());

			this.onSample1Clicked();
			this.initializeChart();
			$('#predict_btn').prop('disabled', true);
		},

		// Event handlers
		onSample1Clicked: function() {
			$('#training_set').text(this.sample_texts[0]);
		},
		onSample2Clicked: function() {
			$('#training_set').text(this.sample_texts[1]);
		},
		onClearClicked: function() {
			$('#training_set').text('');
		},
		onWordCounterChanged: function() {
			this.input_words_counter = parseInt($('#input_word_counter').val());
		},
		onTrainClicked: function() {
			$('#status').val('Initializing...');
			$('.ajax_loader').show();

			let _self = this;
			setTimeout(function() {
				_self.initializeTraining();
			}, 10);
		},
		initializeTraining: async function() {
			console.log('Tokenizing text');
			var tokens = this.tokenize($("#training_set").val());

			var X = [], y = [];
			for (var i=0;i<(tokens.length-this.input_words_counter);i++) {
				var x = [];
				for (var j=0;j<this.input_words_counter;j++) {
					x.push(tokens[i+j]);
				}

				X.push(x);
				y.push(tokens[this.input_words_counter+i]);
			}

			console.log('Training is started');
			this.model = await this.train_model(X, y, 10, parseInt($('#epochs').val()), 0.01);
		},
		onPredictClicked: async function() {
			console.log('Tokenizing input text');
			const tokens = this.cleanseAndSplit($('#prediction_input').val());

			var X = [];
			for (var i=0;i<tokens.length;i++) {
				X.push(this.token_dictionary[tokens[i]]);
			}

			// Padding
			if (tokens.length < this.input_words_counter) {
				for (let i = 0;i<(this.input_words_counter - tokens.length);i++) {
					X.unshift(0);
				}
				console.log('Prediction input tokens is too short, adding elements to the beginning: ', X);
			}

			// Trimming
			if (tokens.length > this.input_words_counter) {
				X = X.slice(-this.input_words_counter)
				console.log('Prediction input tokens is too long, keeping the last ' + this.input_words_counter + ' elements only.');
			}

			let prediction = this.model.predict(
				tf.tensor2d(X, [1, this.input_words_counter])
			);

			let probabilities = await prediction.as1D().data();
			let argMax = probabilities.indexOf(Math.max(...probabilities));
			$('#prediction_output').val(this.index_words[argMax]);
		},
		// https://gist.github.com/dlebech/5bbabaece36753f8a29e7921d8e5bfc7
		cleanseAndSplit: function(text) {
			const filter_reg = /[\\.,/#!$%^&*;:{}=\-_`~()]/g;
			return text
				.toLowerCase()
				.replace(/[\r\n]/g, ' ')
				.replace(filter_reg, '')
				.replace(/\s{2,}/g, ' ')
				.split(' ');
		},
		tokenize: function(text) {
			let wordCounts = {};
			const tokens = this.cleanseAndSplit(text);
			this.token_dictionary = {};
			this.index_words = {};

			tokens.forEach(word => {
				wordCounts[word] = (wordCounts[word] || 0) + 1;
			});

			Object.entries(wordCounts)
				.sort((a, b) => b[1] - a[1])
				.forEach(([word, number], i) => {
					this.token_dictionary[word] = i + 1;
					this.index_words[i + 1] = word;
				});

			this.vocabulary_size = Object.keys(this.token_dictionary).length + 1;
			console.log('Vocabulary size: ' + this.vocabulary_size);

			return tokens.map(word => this.token_dictionary[word] || 0);
		},
		train_model: async function(inputs, outputs, batch_size, n_epochs, learning_rate) {
			let acc = 0;
			const xs = tf.tensor2d(inputs, [inputs.length, inputs[0].length]);
			const ys = tf.tensor1d(outputs);

			let model = tf.sequential();
			model.add(tf.layers.embedding({
				inputDim: this.vocabulary_size,
				outputDim: parseInt($('#embedding_dimension').val()),
				inputLength: this.input_words_counter,
				trainable: true
			}));
			model.add(tf.layers.lstm({units: parseInt($('#lstm_cells').val())}));
			model.add(tf.layers.dense({units: this.vocabulary_size, activation: 'softmax'}));

			model.compile({
				optimizer: tf.train.adam(learning_rate),
				loss: 'sparseCategoricalCrossentropy',
				metrics: ['accuracy']
			});

			// Model fitting
			this.chartData = [];

			// Dual axes
			const hist = await model.fit(xs, ys, {
				'batchSize': batch_size,
				'epochs': n_epochs,
				'callbacks': {
					'onEpochEnd': async (epoch, log) => {
						this.chartData.push({
							epoch: epoch,
							acc: log.acc*100,
							loss: log.loss
						});

						this.updateChart(this.chartData);
						acc = log.acc;
						$('#status').val('Accuracy: ' + (parseInt(acc*10000)/100) + '%');
					},
					'onTrainEnd': async (logs) => {
						console.log('Final accuracy: ' + (parseInt(acc*10000)/100) + '%');
						$('#predict_btn').prop('disabled', false);
						$('.ajax_loader').hide();
					}
				}
			});

			return model;
		},

		// Chart
		initializeChart: function(data) {
			var margin = {top: 20, right: 30, bottom: 20, left: 30},
				svg = d3.select("svg"),
				g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			this.chartWidth = +svg.attr("width") - margin.left - margin.right;
			this.chartHeight = +svg.attr("height") - margin.top - margin.bottom;

			g.append("path").attr("class", "line_acc");
			g.append("path").attr("class", "line_loss");

			g.append("g")
				.attr("class", "x_axis")
				.attr("transform", "translate(0," + this.chartHeight + ")")
				.append("text")
				.attr("fill", "#000")
				.attr("transform", "rotate(0)")
				.attr("y", -5)
				.attr("x", this.chartWidth-5)
				.attr("text-anchor", "end")
				.text("Epoch");

			g.append("g")
				.attr("class", "y_acc_axis")
				.append("text")
				.attr("fill", "orange")
				.attr("transform", "rotate(-90)")
				.attr("y", 15)
				.attr("x", 0)
				.attr("text-anchor", "end")
				.text("Percentage");

			g.append("g")
				.attr("class", "y_loss_axis")
				.attr("transform", "translate(" + this.chartWidth + ",0)")
				.append("text")
				.attr("fill", "steelblue")
				.attr("transform", "rotate(-90)")
				.attr("y", -5)
				.attr("x", 0)
				.attr("text-anchor", "end")
				.text("Value");
		},
		updateChart: function(data) {
			var line_x = d3.scaleLinear()
				.rangeRound([0, this.chartWidth])
				.domain(d3.extent(data, function(d) { return d.epoch; }));
			var line_acc = d3.scaleLinear()
				.rangeRound([this.chartHeight, 0])
				.domain(d3.extent(data, function(d) { return d.acc; }));
			var line_loss = d3.scaleLinear()
				.rangeRound([this.chartHeight, 0])
				.domain(d3.extent(data, function(d) { return d.loss; }));

			var valueline_acc = d3.line()
				.x(function(d) {
					return line_x(d.epoch);
				})
				.y(function(d) {
					return line_acc(d.acc);
				});

			var valueline_loss = d3.line()
				.x(function(d) {
					return line_x(d.epoch);
				})
				.y(function(d) {
					return line_loss(d.loss);
				});

			// Axes
			d3.select("svg").select(".x_axis")
				.call(d3.axisBottom(line_x));
			d3.select("svg").select(".y_acc_axis")
				.call(d3.axisLeft(line_acc));
			d3.select("svg").select(".y_loss_axis")
				.call(d3.axisRight(line_loss));

			d3.selectAll("path.line_acc")
				.datum(data)
				.attr("class", "line_acc")
				.attr("fill", "none")
				.attr("stroke", "orange")
				.attr("stroke-linejoin", "round")
				.attr("stroke-linecap", "round")
				.attr("stroke-width", 1.5)
				.attr("d", valueline_acc);

			d3.selectAll("path.line_loss")
				.datum(data)
				.attr("class", "line_loss")
				.attr("fill", "none")
				.attr("stroke", "steelblue")
				.attr("stroke-linejoin", "round")
				.attr("stroke-linecap", "round")
				.attr("stroke-width", 1.5)
				.attr("d", valueline_loss);
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