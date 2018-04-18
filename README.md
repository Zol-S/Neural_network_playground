# Neural network playground
Neural network tests, applications implemented in Javascript.
## Nearest neighbor applications
### k-Nearest neighbor ### 
Generates cluster centers of different colors and some points around them. Colorize each pixel of the image according to the majority of the k-nearest neighbors. Click regenerate button to generate new cluster centers. Click change button to recolorize the pixels of the image. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#neighbor) for the demo.
### Nearest neighbor classifier ###
Finds similar images in [CIFAR-10](https://www.cs.toronto.edu/~kriz/cifar.html) dataset using Nearest Neighbor Algorithm (L1 & L2 distances). Click on any of the randomly selected images below to search for a visually similar image. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#nnc) for the demo.

## Neural networks ##
### XOR gate ###
XOR gate implemented by a neural network. Click Weights and biases button to edit the weight matrix and biases and view the value of the hidden layers. To calculate the output of the neural network, enter input values to the input fields and click Submit button. Hover any elements of the neural network to view its internal values. Demo implementation of [Deep Learning - Ian Goodfellow, Yoshua Bengio, Aaron Courville](http://www.deeplearningbook.org/contents/mlp.html) example on page 171. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#xor) for the demo.
### Backpropagation ###
OR gate implemented by 3-layer neural network with sigmoid activation and MSE loss function using MathJS. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#backpropagate) for the demo.
### 2D data classification ###
2D data classification with [Synaptic.js](http://caza.la/synaptic) Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#classify_2d) for the demo.
### Loss functions ###
Demonstrates minimum search with [unnormalized gradient descent](http://caza.la/synaptic) algorithm. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#loss_functions) for the demo.
### PCA on MNIST digits ###
PCA performed on MNIST digits. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#mnist_pca) for the demo.

## Convolutional networks ##
### Max pooler ###
Max and average pooling MNIST 28x28 images down to 14x14 and 7x7 images using different spatial striding. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#max_pooler) for the demo.
### Number recognizer ###
Trained [Synaptic.js](http://caza.la/synaptic) neural network to recognize max pooled 14x14 pixel [CIFAR-10](https://www.cs.toronto.edu/~kriz/cifar.html) digits. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#number_recognizer) for the demo.
### Face detector ###
Trained a convolutional network with [Tensorflow](https://www.tensorflow.org)/[Keras](https://keras.io) on a very few samples of faces an other things, then exported the weights to [Tensorflow JS](https://github.com/tomasreimers/tensorflowjs).(https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#number_recognizer) for the demo.