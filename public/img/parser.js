// dependencies
var program = require('commander'),
	path = require('path'),
	pngjs = require('pngjs').PNG,
	mkdirp = require('mkdirp'),
	uuid = require('node-uuid'),
	fs = require('fs');

// constants
var CHUNK_SIZE = 3073;
var PROCESS_LIMIT = 100;

// argv parse
program
	.version('0.0.1')
	.option('-i, --input <path>', 'parse files location')
	.option('-p, --process', 'parse files')
	.parse(process.argv);

/* STATE */
var cursor = 0;
var datasetfile = path.join(__dirname, program.input);

/* HELPERS */

var quit = function(err, code) {
	if(err) console.log(err);
	process.exit(code);
};

var savePng = function (buff, index, dir, done) {

	// png obj
	var png = new pngjs({
		width: 32,
		height: 32,
		filterType: -1
	});

	// parse buffer
	for (var y = 0; y < png.height; y++) {
		for (var x = 0; x < png.width; x++) {
			var idx = (png.width * y + x) << 2;
			png.data[idx  ] = buff.readInt8(y*png.height+x+1);      // R
			png.data[idx+1] = buff.readInt8(y*png.height+x+1024+1); // G
			png.data[idx+2] = buff.readInt8(y*png.height+x+2048+1); // B
			png.data[idx+3] = 255;                                  // A
		}
	}

	// pack & stream to file
	mkdirp(dir, function () {
		png.pack()
			.pipe(fs.createWriteStream(path.join(dir, [index, buff.readInt8(0),'png'].join('.'))))
			.on('close', done);	
	});
	
};

var parse = function(buff, size, cursor, dir, cb) {
	var classification = buff.readInt8(0);
	console.log(classification, buff.length, cursor, size, ((cursor/size)*100).toFixed(2)+'%');
	savePng(buff, cursor/CHUNK_SIZE, dir, cb);
};

var readFile = function (fd, dir, buffer, size, callback) {
	fs.read(fd, buffer, 0, CHUNK_SIZE, null, function(err, nread) {
		if (nread === 0 || (PROCESS_LIMIT > 0 && cursor > (PROCESS_LIMIT * CHUNK_SIZE))) {
			callback();
		} else {
			cursor += nread;
			parse(nread < CHUNK_SIZE ? buffer.slice(0, nread) : buffer, size, cursor, dir, function () {
				readFile(fd, dir, buffer, size, callback);
			});
		}
	});
};

// check file exists
fs.exists(datasetfile, function (exists) {
	if (!exists) return quit(new Error('file does not exist'), 1);

	// get file information
	fs.stat(datasetfile, function (err, stats) {
		if(err) return quit(err, 1);

		// initiate memory buffer of CHUNK_SIZE
		var buffer = new Buffer(CHUNK_SIZE);

		// open file for reading
		fs.open(datasetfile, 'r', function(status, fd) {
			if (status) return console.log(status.message);

			// initiate recursive read
			readFile(fd, path.join(__dirname, path.basename(datasetfile).split('.')[0]), buffer, stats.size, function () {
				fs.close(fd, function (err) {
					quit(err, !!err ? 1 : 0);
				});
			});
		});
	});
});