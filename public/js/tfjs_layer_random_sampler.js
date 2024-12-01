define([
	'tfj4220'
], function (tf) {
	'use strict';

	return class RandomSampler extends tf.layers.Layer {
		static className = 'RandomSampler';

		constructor() {
			console.log('RandomSampler constructor called');
			super({});
			this.supportsMasking = true;
		}

		computeOutputShape(inputShape) {
			return [inputShape[0][1], inputShape[1][1]]
		}

		call(inputs, kwargs) {
			console.log(inputs, kwargs);
			this.invokeCallHook(inputs, kwargs);

			const tensor1 = inputs[0], tensor2 = inputs[1];
			const epsilon = tf.randomNormal(tensor1.shape, 0, 1);
			let random_sample = tensor1 + tf.mul(tf.exp(tf.div(tensor2, 2)), epsilon);

			return random_sample;
		}
	}

	tf.serialization.registerClass(RandomSampler);
})