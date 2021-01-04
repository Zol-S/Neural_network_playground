define([
	//'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/pooling.html',
	'json!neural/mnist_dataset/mnist_dataset_100.json',
	'bootstrap'
], function ( _, Backbone, PoolingTemplate, mnist_data) { // $,
	'use strict';

	let view = Backbone.View.extend({
		el: '#main',
		events: {
			'click #change_btn': 'onChangeClicked'
		},
		mnist_digit_width: 28,
		render: function() {
			this.$el.empty();

			let template = _.template(PoolingTemplate);
			this.$el.append(template());

			this.drawImages();
		},
		onChangeClicked: function() {
			this.drawImages();
		},
		getAllIndexes: function(arr, val) {
			let indexes = [], i;
			for	(i = 0; i < arr.length; i++)
				if (arr[i] === val) indexes.push(i);

			return indexes;
		},
		drawImages: function() {
			let image_data = mnist_data.train_data[Math.floor(Math.random()*mnist_data.train_data.length)].flat();
			this.drawImage('input', this.mnist_digit_width, image_data);

			// Spatial extent: 2, stride: 2
			let img_2max14 = this.max_pooler_e2s2(image_data, this.mnist_digit_width);
			let img_2avg14 = this.avg_pooler_e2s2(image_data, this.mnist_digit_width);
			this.drawImage('output_2max14', 14, img_2max14);
			this.drawImage('output_2avg14', 14, img_2avg14);

			this.drawImage('output_2max7', 7, this.max_pooler_e2s2(img_2max14, 14));
			this.drawImage('output_2avg7', 7, this.avg_pooler_e2s2(img_2avg14, 14));

			// Spatial extent: 3, stride: 2
			let img_3max14 = this.max_pooler_e3s2(image_data, this.mnist_digit_width);
			let img_3avg14 = this.avg_pooler_e3s2(image_data, this.mnist_digit_width);

			this.drawImage('output_3max14', 14, img_3max14);
			this.drawImage('output_3avg14', 14, img_3avg14);

			this.drawImage('output_3max7', 7, this.max_pooler_e3s2(img_3max14, 14));
			this.drawImage('output_3avg7', 7, this.avg_pooler_e3s2(img_3avg14, 14));

			this.updateZoomedImages();
		},
		updateZoomedImages: function() {
			let _self = this, ids = $('.digit').map(function() {
				let output = document.getElementById(this.id + "_big");
				_self.drawZoomedImage(this.getContext("2d"), 14, 14, output.getContext("2d"), 140, 140)
			}); //.get();

			//let input = document.getElementById("output_2max14"), output = document.getElementById("zoom");
			//this.drawZoomedImage(input.getContext("2d"), 14, 14, output.getContext("2d"), 140, 140);
		},
		drawZoomedImage: function(source_ctx, sw, sh, target_ctx, tw, th) {
			let source = source_ctx.getImageData(0, 0, sw, sh);
			let sdata = source.data;

			let target = target_ctx.createImageData(tw, th);
			let tdata = target.data;

			let mapx = [];
			let ratiox = sw / tw, px = 0;
			for (let i = 0; i < tw; ++i) {
				mapx[i] = 4 * Math.floor(px);
				px += ratiox;
			}

			let mapy = [];
			let ratioy = sh / th, py = 0;
			for (let i = 0; i < th; ++i) {
				mapy[i] = 4 * sw * Math.floor(py);
				py += ratioy;
			}

			let tp = 0;
			for (py = 0; py < th; ++py) {
				for (px = 0; px < tw; ++px) {
					let sp = mapx[px] + mapy[py];
					tdata[tp++] = sdata[sp++];
					tdata[tp++] = sdata[sp++];
					tdata[tp++] = sdata[sp++];
					tdata[tp++] = sdata[sp++];
				}
			}

			target_ctx.putImageData(target, 0, 0);
		},
		max_pooler_e3s2: function(img_in, img_in_width) {
			let img_dum = [], img_out = [];

			// Add padding
			for (let i=0;i<img_in.length;i++) {
				if (i%img_in_width == img_in_width-1) {
					img_dum.push(0)
				}

				img_dum.push(img_in[i]);
			}
			img_dum.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
			img_in_width++;

			// Pooling
			let i = 0, within_row_counter = 0;
			while (i < (img_dum.length-2*img_in_width)) {
				img_out.push(Math.max(
					img_dum[i],
					img_dum[i+1],
					img_dum[i+2],
					img_dum[i+img_in_width],
					img_dum[i+img_in_width+1],
					img_dum[i+img_in_width+2],
					img_dum[i+2*img_in_width],
					img_dum[i+2*img_in_width+1],
					img_dum[i+2*img_in_width+2],
				));
				within_row_counter+=2;

				i+=2;
				if (within_row_counter == img_in_width-1) {
					i+= img_in_width*2+1;
					within_row_counter = 0;
				}
			}

			return img_out;
		},
		avg_pooler_e3s2: function(img_in, img_in_width) {
			let img_dum = [], img_out = [];

			// Add padding
			for (let i=0;i<img_in.length;i++) {
				if (i%img_in_width == img_in_width-1) {
					img_dum.push(0)
				}

				img_dum.push(img_in[i]);
			}
			img_dum.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
			img_in_width++;

			// Pooling
			let i = 0, within_row_counter = 0;
			while (i < (img_dum.length-2*img_in_width)) {
				img_out.push((
					img_dum[i]+
					img_dum[i+1]+
					img_dum[i+2]+
					img_dum[i+img_in_width]+
					img_dum[i+img_in_width+1]+
					img_dum[i+img_in_width+2]+
					img_dum[i+2*img_in_width]+
					img_dum[i+2*img_in_width+1]+
					img_dum[i+2*img_in_width+2]
				)/9);
				within_row_counter+=2;

				i+=2;
				if (within_row_counter == img_in_width-1) {
					i+= img_in_width*2+1;
					within_row_counter = 0;
				}
			}

			return img_out;
		},
		max_pooler_e2s2: function(img_in, img_in_width) {
			let img_out = [], i = 0;

			while (i < img_in.length-img_in_width) {
				img_out.push(Math.max(
					img_in[i]+
					img_in[i+1]+
					img_in[i+img_in_width]+
					img_in[i+img_in_width+1]
				));

				i+=2;
				if (i%img_in_width == 0) {
					i+= img_in_width;
				}
			}

			return img_out;
		},
		avg_pooler_e2s2: function(img_in, img_in_width) {
			let img_out = [], i = 0;

			while (i < img_in.length-img_in_width) {
				img_out.push((
					img_in[i]+
					img_in[i+1]+
					img_in[i+img_in_width]+
					img_in[i+img_in_width+1]
				)/4);

				i+=2;
				if (i%img_in_width == 0) {
					i+= img_in_width;
				}
			}

			return img_out;
		},
		drawImage: function(target_id, size, img_data) {
			let canvas = document.getElementById(target_id);
			canvas.width = canvas.height = size;
			let ctx = canvas.getContext("2d");
			let canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);

			let img_pos = 0;
			for (let i = 0; i < img_data.length; i++) {
				let color = img_data[i];
				canvasData.data[img_pos * 4 + 0] = 255-color;
				canvasData.data[img_pos * 4 + 1] = 255-color;
				canvasData.data[img_pos * 4 + 2] = 255-color;
				canvasData.data[img_pos * 4 + 3] = 255;
				img_pos++;
			}

			ctx.putImageData(canvasData, 0, 0);
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