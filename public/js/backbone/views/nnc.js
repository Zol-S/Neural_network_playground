define([
	'jquery',
	'underscore',
	'backbonejs',
	'text!backbone/templates/nnc.html',
	'bootstrap'
], function ($, _, Backbone, similarTemplate) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		images: ['9.9', '1.6','10.3','100.1','101.8','11.4','12.7','13.7','14.2','15.9','16.9','17.9','18.3','19.2','2.9','20.6','21.4','22.3','23.6','24.6','25.2','26.6','27.3','28.5','29.4','3.9','30.0','31.0','32.9','33.1','34.3','35.4','36.0','37.3','38.7','39.3','4.4','40.3','41.5','42.2','43.2','44.7','45.1','46.1','47.1','48.2','49.2','5.1','50.0','51.9','52.5','53.7','54.9','55.2','56.2','57.5','58.2','59.4','6.1','60.3','61.1','62.1','63.8','64.2','65.1','66.1','67.4','68.9','69.7','7.2','70.8','71.5','72.9','73.6','74.7','75.3','76.1','77.9','78.0','79.3','8.7','80.1','81.3','82.5','83.4','84.5','85.7','86.7','87.4','88.7','89.9','90.4','91.2','92.3','93.8','94.0','95.1','96.6','97.1','98.1','99.4'],
		events: {
			'click #distance': 'onDistanceClicked',
			'click .image_btn': 'onImageClicked'
		},
		initialize: function() {
			this.numberOfImagesToShow = 10;
			this.numberOfImagesLoaded = 0;
			this.imagesToSelect = ['9.8'];

			for (var i=0;i<9;i++) {
				this.imagesToSelect.push(this.images[Math.floor(Math.random()*this.images.length)]);
			}
		},
		render: function() {
			this.$el.empty();

			var template = _.template(similarTemplate);
			this.$el.append(template({
				images: this.imagesToSelect
			}));
		},
		onImageClicked: function(e) {
			var _self = this;
			var target_id = $(e.target).data('id');
			$('#stage').append('<p>Selected image: <img src="public/img/cifar-10/' + target_id + '.png"></p>');

			// Initialize image
			this.selected_image = -1;
			this.image_array = [];
			this.iter = 0;

			// Main image
			this.loadCifarImgData(target_id, function(k, d) {
				_self.selected_image = d;
			});

			// Other images
			for (var i in this.images) {
				if (this.images[i] != target_id) {
					this.loadCifarImgData(this.images[i], function(k, d) {
						_self.image_array.push({
							id: k,
							l1: _self.calculateDistanceL1(d),
							l2: _self.calculateDistanceL2(d)
						});

						if (++_self.iter == (_self.images.length-1)) {
							_self.showTopDistances();
						}
					});
				}
			}
		},
		calculateDistanceL1: function(d) {
			var distance = 0;

			for (var i=0;i<this.selected_image.length;i++) {
				distance+= Math.abs(this.selected_image[i]-d[i]);
			}

			return distance;
		},
		calculateDistanceL2: function(d) {
			var distance = 0;

			for (var i=0;i<this.selected_image.length;i++) {
				distance+= Math.pow(this.selected_image[i]-d[i], 2);
			}

			return Math.floor(Math.sqrt(distance));
		},
		showTopDistances: function() {
			// L1 distances
			var l1Img2show = this.image_array.sort(function(a, b) {
				return a.l1 - b.l1;
			}).slice(0, this.numberOfImagesToShow);

			$('#stage').append('Similar images according to L1 distances: <p>');
			for (var i in l1Img2show) {
				$('#stage').append('<img src="public/img/cifar-10/' + l1Img2show[i].id + '.png" title="' + l1Img2show[i].l1 + '">');
			}
			$('#stage').append('</p>');

			// L2 distances
			var l2Img2show = this.image_array.sort(function(a, b) {
				return a.l2 - b.l2;
			}).slice(0, this.numberOfImagesToShow);

			$('#stage').append('Similar images according to L2 distances: <p>');
			for (var i in l2Img2show) {
				$('#stage').append('<img src="public/img/cifar-10/' + l2Img2show[i].id + '.png" title="' + l2Img2show[i].l2 + '">');
			}
			$('#stage').append('</p>');
		},
		loadCifarImgData: function(key, _callback) {
			var image = new Image();
			image.crossOrigin = "Anonymous";
			image.src = 'public/img/cifar-10/' + key + '.png';
			image.setAttribute('crossOrigin', '');
			image.onload = function() {
				var context = document.getElementById('canvas').getContext('2d');
				context.clearRect(0, 0, 32, 32);
				context.drawImage(image, 0, 0);

				_callback(key, context.getImageData(0, 0, 32, 32).data);
			}
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