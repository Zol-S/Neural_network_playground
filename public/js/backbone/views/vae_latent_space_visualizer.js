define([
	'underscore',
	'backbonejs',
	'text!backbone/templates/vae_latent_space_visualizer.html',
	'tfjs4220',
	'random_sampler',
	'bootstrap'
], function(_,Backbone, VAELatentSpaceVisualizerTemplate, tf, RandomSampler) {
	'use strict';

	var view = Backbone.View.extend({
		el: '#main',
		initialize: function() {
			console.log('VAE latent space visualizer');
		},
		events: {
			'click #train_btn': 'onTrainBtnClicked',
			'click #load_btn': 'onLoadBtnClicked'
		},
		render: function() {
			this.$el.empty();

			let template = _.template(VAELatentSpaceVisualizerTemplate);
			this.$el.append(template());

			$('#progress_bar').hide();
		},
		// https://jakearchibald.com/2016/streams-ftw/
		onLoadBtnClicked: async function() {
			let request = new XMLHttpRequest(), _self = this;

			request.addEventListener('readystatechange', function(e) {
				if (request.readyState == 2 && request.status == 200) {
					$('#progress_bar').show();
					$('#progress_bar .progress-bar').css('width', '0%');
					$('#progress_bar .progress-bar').text('0%');
				} else if(request.readyState == 4) {
					_self.dataset = JSON.parse(request.responseText); 
				}
			});
			
			request.addEventListener('progress', function(e) {
				let percent_complete = (e.loaded / e.total)*100;
				$('#progress_bar .progress-bar').css('width', parseInt(percent_complete)+'%');
				$('#progress_bar .progress-bar').text(parseInt(percent_complete)+'%');
			});
			
			//request.responseType = 'blob';

			const ds = document.getElementById('dataset_selector');
			request.open('get', 'public/js/neural/mnist_dataset/mnist_dataset_' + ds.options[ds.selectedIndex].value + '.json'); 
			request.send(); 
		},
		onTrainBtnClicked: function() {
			console.log(this.dataset);
			// encoder
			let vae_input = tf.input({shape: 784});
			let vae_x = tf.layers.dense({units: 2, activation: 'relu'}).apply(vae_input);

			let vae_z_mean = tf.layers.dense({name: 'z_mean', units: 2}).apply(vae_x);
			let vae_z_log_var = tf.layers.dense({name: 'z_log_var', units: 2}).apply(vae_x);

			const layer = new RandomSampler();
			const vae_z = layer.apply([vae_z_mean, vae_z_log_var]);

			const encoder_model = tf.model({name: 'encoder', inputs: vae_input, outputs: [vae_z_mean, vae_z_log_var, vae_z]});
			//encoder_model.summary();
			
			// decoder
			let latent_input = tf.input({shape: 2});
			let latent_x = tf.layers.dense({units: 512, activation: 'relu'}).apply(latent_input);
			let latent_output = tf.layers.dense({units: 784, activation: 'sigmoid'}).apply(latent_x);
			
			const decoder_model = tf.model({name: 'decoder', inputs: latent_input, outputs: latent_output});
			//decoder_model.summary();

			// VAE model
			let vae_output = decoder_model.apply(encoder_model.apply(vae_input)[2]);
			const vae_model = tf.model({inputs: vae_input, outputs: vae_output});

			// Loss
			/*
			def custom_loss(y_true, y_pred):
				return keras.backend.mean(keras.backend.square(y_true - y_pred), axis=-1)
			*/
			/*let reconstruction_loss = tf.metrics.meanAbsoluteError(vae_input, latent_output);
			reconstruction_loss = tf.mul(reconstruction_loss, 784);
			let kl_loss = 1 + z_log_var - tf.square(z_mean) - tf.exp(z_log_var);
			kl_loss = tf.sum(kl_loss, -1);
			kl_loss = tf.mul(kl_loss, -0.5);
			let vae_loss = tf.mean(reconstruction_loss + kl_loss);
			vae_model.compile({optimizer: 'adam', loss: vae_loss});*/
			vae_model.compile({optimizer: 'adam', loss: 'meanSquaredError'});
			vae_model.summary();

			vae_model.fit(this.dataset.train_data, this.dataset.train_label);
		},
		destroy: function() {
			this.showTensorflowInformation('Tensorflow state before model disposal');
			tf.disposeVariables();
			this.showTensorflowInformation('Tensorflow state after disposal');

			this.undelegateEvents();
			this.$el.empty();
			this.stopListening();
			return this;
		},
		showTensorflowInformation: function(msg) {
			console.group(msg);
			console.log('Number of bytes allocated:', this.getReadableFileSizeString(tf.memory().numBytes));
			console.log('Number of Tensors in memory: ', tf.memory().numTensors);
			console.log('Number of unique data buffers allocated:', tf.memory().numDataBuffers);
			if (tf.memory().unreliable) {
				console.log('Reasons why the memory is unreliable:', tf.memory().reasons);
			}
			console.groupEnd();
		},
		getReadableFileSizeString: function(fileSizeInBytes) {
			let i = -1;
			let byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
			do {
				fileSizeInBytes = fileSizeInBytes / 1024;
				i++;
			} while (fileSizeInBytes > 1024);

			return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
		}
	});

	return view;
});
// https://fairyonice.github.io/achieving-top-23-in-kaggles-facial-keypoints-detection-with-keras-tensorflow.html
// https://fairyonice.github.io/Visualization%20of%20Filters%20with%20Keras.html
// https://blog.keras.io/how-convolutional-neural-networks-see-the-world.html
// https://js.tensorflow.org/api/latest/#grads
// https://stackoverflow.com/questions/54728772/computing-the-gradient-of-the-loss-using-tensorflow-js