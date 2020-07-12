### LSTM (2020.07.12) ###
Train LSTM with custom text to predict the next word of it. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#lstm) for the demo.

# Neural network playground
Neural network tests, applications implemented in Javascript.
## Nearest neighbor applications
### k-Nearest neighbor ### 
Generates cluster centers of different colors and some points around them. Colorize each pixel of the image according to the majority of the k-nearest neighbors. Click regenerate button to generate new cluster centers. Click change button to recolorize the pixels of the image. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#neighbor) for the demo.
### Nearest neighbor classifier ###
Finds similar images in [CIFAR-10](https://www.cs.toronto.edu/~kriz/cifar.html) dataset using Nearest Neighbor Algorithm (L1 & L2 distances). Click on any of the randomly selected images below to search for a visually similar image. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#nnc) for the demo.
### Clustering algorithms ###
Implemented the clustering algorithms mentioned in [George Seif - The 5 Clustering Algorithms Data Scientists Need to Know](https://towardsdatascience.com/the-5-clustering-algorithms-data-scientists-need-to-know-a36d136ef68).

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
### Pooling ###
Max and average pooling MNIST 28x28 images down to 14x14 and 7x7 images using different spatial striding. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#pooling) for the demo.
### Digit recognizer - basic ###
Draw a digit to a square of 28x28 pixels or click on any of the buttons below to show a nice digit of the MNIST dataset to feed the data of the drawn image to the convolutional network. The top 3 results will be shown below with the probability percentages. The application is implemented by using <a href="https://js.tensorflow.org/" target="_blank">Tensorflow.js</a>. The model has an accuracy of 98.96% and the size of the model and the weights are as little as 725 kB. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#digit_recognizer_basic) for the demo.
### Digit recognizer - advanced ###
Does everything as the basic digit recognizer plus shows the activation maps for each layer. The application is implemented by using <a href="https://js.tensorflow.org/" target="_blank">Tensorflow.js</a>. The model has an accuracy of 98.96% and the size of the model and the weights are as little as 725 kB. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#digit_recognizer_advanced) for the demo.
### Convolutional layers ###
In this interactive tutorial, convolutional and pooling layers can be linked together and send them colourful images. Convolutional and pooling layers can be inserted to the end of the network. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#convolutional_layers) for the demo.
### Face detector ###
Trained a convolutional network with [Tensorflow](https://www.tensorflow.org)/[Keras](https://keras.io) on a very few samples of faces an other things, then exported the weights to [Tensorflow JS](https://github.com/tomasreimers/tensorflowjs).Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#face_detector) for the demo.
### CNN layer visualizer (2020.02.09) ###
The live stream of your webcam is sent to a CNN, then the output of the layers are printed out. Click [here](https://rawgit.com/Zol-S/Neural_network_playground/master/index.html#cnn_layer_visualizer) for the demo.
