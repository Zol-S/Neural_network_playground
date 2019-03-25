define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/convolutional_layers.html',
	'text!backbone/templates/convolutional_layers_layer.html',
	'bootstrap'
], function ($, _, Backbone, convolutionalLayersTemplate, layerTemplate) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		kernel_type: {
			identity: [
				[0, 0, 0],
				[0, 1, 0],
				[0, 0, 0]
			],
			blur: [
				[0.0625, 0.125, 0.0625],
				[0.125, 0.25, 0.125],
				[0.0625, 0.125, 0.0625]
			],
			top_sobel: [
				[1, 2, 1],
				[0, 0, 0],
				[-1, -2, -1]
			],
			bottom_sobel: [
				[-1, -2, -1],
				[0, 0, 0],
				[1, 2, 1]
			],
			left_sobel: [
				[1, 0, -1],
				[2, 0, -2],
				[1, 0, -1]
			],
			right_sobel: [
				[-1, 0, 1],
				[-2, 0, 2],
				[-1, 0, 1]
			],
			emboss: [
				[-2, -1, 0],
				[-1, 1, 1],
				[0, 1, 2]
			],
			sharpen: [
				[0, -1, 0],
				[-1, 5, -1],
				[0, -1, 0]
			],
			outline: [
				[-1, -1, -1],
				[-1, 8, -1],
				[-1, -1, -1]
			]
		},
		layers: [
			{
				type: 'input',
				output: 100
			}
		],
		initialize: function() {
			// https://en.wikipedia.org/wiki/Kernel_(image_processing)
			// http://setosa.io/ev/image-kernels/
		},
		render: function() {
			this.$el.empty();

			var template = _.template(convolutionalLayersTemplate);
			this.$el.append(template({
				base_url: window.base_url,
				public_directory: window.public_directory
			}));

			this.onTypeChanged();
		},
		events: {
			'click .input': 'onInputClicked',
			'click #add_layer_btn': 'onAddLayerClicked',
			'change #type': 'onTypeChanged',
			'change #kernel_type': 'onKernelTypeChanged',
			'click .close': 'onCloseClicked'
		},
		destroy: function() {
			this.undelegateEvents();
			this.$el.empty();
			this.stopListening();
			return this;
		},

		// UI handling
		onInputClicked: function(e) {
			var input = $(e.target).data('name'), feature_maps = {r: this._createArray(100, 0), g: this._createArray(100, 0), b: this._createArray(100, 0)};

			for (var i=0;i<this.layers.length;i++) {
				switch (this.layers[i].type) {
					case 'input':
							var pixelData = this._getImageData(e.target).data;
							for (var k=0;k<pixelData.length;k+=4) {
								var pk = k/4;
								feature_maps.r[Math.floor(pk/100)][pk%100] = parseInt(pixelData[k]);
								feature_maps.g[Math.floor(pk/100)][pk%100] = parseInt(pixelData[k+1]);
								feature_maps.b[Math.floor(pk/100)][pk%100] = parseInt(pixelData[k+2]);
								//feature_map[Math.floor(pk/100)][pk%100] = parseInt(this._convertRGB2grayscale(pixelData[k], pixelData[k+1], pixelData[k+2]));
							}
						break;
					case 'conv2d':
							feature_maps.r = this._convolve2d(feature_maps.r, this.kernel_type[this.layers[i].kernel_type], this.layers[i].stride, this.layers[i].padding, 'conv2d');
							feature_maps.g = this._convolve2d(feature_maps.g, this.kernel_type[this.layers[i].kernel_type], this.layers[i].stride, this.layers[i].padding, 'conv2d');
							feature_maps.b = this._convolve2d(feature_maps.b, this.kernel_type[this.layers[i].kernel_type], this.layers[i].stride, this.layers[i].padding, 'conv2d');
							this._displayImage('canvas_r_' + this.layers[i].id, feature_maps.r, this.layers[i].output, 1);
							this._displayImage('canvas_g_' + this.layers[i].id, feature_maps.g, this.layers[i].output, 1);
							this._displayImage('canvas_b_' + this.layers[i].id, feature_maps.b, this.layers[i].output, 1);
						break;
					case 'avg_pooling':
					case 'max_pooling':
							feature_maps.r = this._convolve2d(feature_maps.r, this.layers[i].kernel_size, this.layers[i].stride, this.layers[i].padding, this.layers[i].type);
							feature_maps.g = this._convolve2d(feature_maps.g, this.layers[i].kernel_size, this.layers[i].stride, this.layers[i].padding, this.layers[i].type);
							feature_maps.b = this._convolve2d(feature_maps.b, this.layers[i].kernel_size, this.layers[i].stride, this.layers[i].padding, this.layers[i].type);
							console.log(feature_maps);
							this._displayImage('canvas_r_' + this.layers[i].id, feature_maps.r, this.layers[i].output, 1);
							this._displayImage('canvas_g_' + this.layers[i].id, feature_maps.g, this.layers[i].output, 1);
							this._displayImage('canvas_b_' + this.layers[i].id, feature_maps.b, this.layers[i].output, 1);
				}
			}
		},
		onCloseClicked: function(e) {
			var id = parseInt($(e.target).data('id'));
			this.layers.splice(id, 1);
			$(e.target).closest('.card').remove();
			console.log(this.layers);
		},
		onTypeChanged: function() {
			if ($('#type').val() != 'conv2d') {
				$('#kernel_type').attr('disabled', 'disabled');
				$('#kernel_size').removeAttr('disabled');
			} else {
				$('#kernel_type').removeAttr('disabled');
				$('#kernel_size option[value="3"]').prop('selected', true);
				$('#kernel_size').attr('disabled', 'disabled');
			}
		},
		onKernelTypeChanged: function(e) {
			$('#kernel_size option[value="3"]').prop('selected', true);
		},
		onAddLayerClicked: function() {
			var input = this.layers[this.layers.length-1].output,
				kernel_size = parseInt($('#kernel_size').val()),
				padding = ($('#padding').val()=='same'?Math.floor(kernel_size/2):0),
				stride = parseInt($('#stride').val()),
				output = Math.floor((input+2*padding-kernel_size)/stride) + 1,
				template = _.template(layerTemplate),
				layer = {
					counter: this.layers.length,
					id: 'layer_' + this.layers.length,
					type: $('#type').val(),
					input: this.layers[this.layers.length-1].output,
					kernel_size: kernel_size,
					kernel_type: $('#kernel_type').val(),
					stride: stride,
					padding: padding,
					output: output
				};

			this.layers.push(layer);
			$('#layers').append(template(layer));

			console.log(this.layers);
		},

		// layer functions
		_convolve2d: function(i, k, s, p, t) {
			var k_size = (typeof k == 'number'?k:k.length), o_size = Math.floor((i.length+2*p-k_size)/s) + 1, o = this._createArray(o_size, 0);

			for (var lx=-p, mx=0;lx<=(i.length-k_size);lx+=s, mx++) {
				for (var ly=-p, my=0;ly<=(i.length-k_size);ly+=s, my++) {
					var value = 0;

					for (var kx=0;kx<k_size;kx++) {
						for (var ky=0;ky<k_size;ky++) {
							if ((lx+kx)>0 && (ly+ky)>0 && typeof i[lx+kx][ly+ky] != 'undefined') {
								switch (t) {
									case 'conv2d':
											value+= i[lx+kx][ly+ky] * k[kx][ky];
										break;
									case 'max_pooling':
											if (Math.max(value, i[lx+kx][ly+ky])) {
												value = i[lx+kx][ly+ky];
											}
										break;
									case 'avg_pooling':
										value+= i[lx+kx][ly+ky];
								}
							}
						}
					}

					if (t == 'avg_pooling') {
						value/= k_size*k_size;
					}

					o[mx][my] = (value>255?255:(value<0?0:Math.floor(value)));
				}
			}
			return o;
		},

		// array functions
		_range: function(n) {
			return Array(n).fill(0);
		},
		_createArray: function(dim, value) {
			var _self = this;
			return this._range(dim).map(function(v) { return _self._range(dim).map(function(v) { return value;})});
		},

		// color functions
		_convertComponent2Hex: function(c) {
			var hex = c.toString(16);
			return hex.length == 1 ? "0" + hex : hex;
		},
		/*_convertRGB2grayscale: function(r, g, b) {
			return .2126*r + .7152*g + .0722*b;
		},*/

		// image functions
		_getImageData: function(image) {
			var canvas = document.createElement('canvas');
			canvas.width = image.width;
			canvas.height = image.height;

			var context = canvas.getContext( '2d' );
			context.drawImage(image, 0, 0);

			return context.getImageData(0, 0, image.width, image.height);
		},
		_displayImage: function(canvas_id, image_array, shape, size) {
			var ctx = document.getElementById(canvas_id).getContext("2d");

			for (var i=0;i<shape;i++) {
				for (var k=0;k<shape;k++) {
					var color = this._convertComponent2Hex(image_array[k][i]);
					ctx.fillStyle="#" + color + color + color;
					ctx.fillRect(i*size, k*size, size, size);
				}
			}
		}
	});

	return view;
});