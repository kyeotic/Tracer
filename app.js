window.requestAnimFrame = 
	window.requestAnimationFrame || 
	window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame || 
	window.msRequestAnimationFrame || 
	function (callback) {
		window.setTimeout(callback, 1000 / 60);
	};

var DebugSegment = function(line) {
	this.output = 'Start: ' + line.a.x + ', ' + line.a.y
					+ ', Finish: ' + line.b.x + ', ' + line.b.y;
};

var DebugOutput = function(output) {
	this.output = output;
};

function radiansToDegrees(radians) {
	return radians * (180 /  Math.PI);
}

function degreesToRadians(degrees) {
	return degrees * (Math.PI / 180);
}

function getTanDeg(deg) {
	 return Math.tan(degreesToRadians(deg));
}

function convertAngleToSlope(angle) {
	return getTanDeg(angle);
};

Math.degreeSin = function(degrees) { return Math.sin(degreesToRadians(degrees)); };
Math.degreeTan = function(degrees) { return Math.tan(degreesToRadians(degrees)); };

//getTanDeg(angle) = slope

function getSlope(p1, p2) {
	return (p2.y - p1.y) / (p2.x - p1.x);
}

function getLength(p1, p2) {
	return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function getReflectiveSlope(p1, p2, angle) {
	var slope = getSlope(p1, p2),
		radianAngle = degreesToRadians(angle),
		tangentAngle = Math.tan(radianAngle);

	return ( tangentAngle + slope) / ( tangentAngle - slope);
}

//angle = (slope1 - slope2) / ( 1 + slope1 x slope2)
//tan(angle) = slope
//arctan(slope) = angle

//radiansToDegrees(Math.atan(slope)) = angle
//Math.tan(degreesToRadians(angle)) = slope

var Point = function(x, y) {
	var self = this,
		_x, _y;

	Object.defineProperty(self, 'x', {
		get: function() { return _x; },
		set: function(value) { return _x = Math.floor(value); }
	});

	Object.defineProperty(self, 'y', {
		get: function() { return _y; },
		set: function(value) { return _y = Math.floor(value); }
	});

	self.x = x;
	self.y = y;

	self.add = function(point) { self.x += point.x; self.y += point.y;  };
	self.multiply = function(point) { self.x *= point.x; self.y *= point.y; };
	self.subtract = function(point) { self.x -= point.x; self.y -= point.y; };

	self.copy = function() { return new Point(self.x, self.y); };
};

Point.prototype.toString = function() {
	return 'X: ' + this.x + ', Y: ' + this.y;
};

var getMidPoint = function(p1, p2) {
	return new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
};


var LineSegment = function(a, b) {
	var self = this;

	self.a = a;
	self.b = b;

	Object.defineProperty(self, 'slope', {
		get: function() { return getSlope(self.a, self.b); }
	});

	Object.defineProperty(self, 'length', {
		get: function() { return getLength(self.a, self.b); }
	});

	self.copy = function() {
		return new LineSegment(self.a, self.b);
	};

	self.getMidPoint = function() { return getMidPoint(self.a, self.b); };
};

var SliderViewmodel = function(name, initial, min, max, step, valueHandler) {
	var self = this;

	self.value = ko.observable(initial);
	self.value.subscribe(function(n) { valueHandler(n); });
	
	self.name = name;
	self.step = step;
	self.min = min;
	self.max = max;
};

var DrawViewmodel = function(canvasId, config) {
	var self = this,
		c = config;
	//Canvas properties
	self.canvas = null;
	self.context = null;
	
	self.debugLines = ko.observableArray();
	
	//
	//Drawable Properties
	//
	
	//We haven't assigned this yet, and would lose the context even if we did
	//The handler should call draw even if the property is reassigned
	var subHandler = function() { self.draw(); }

	self.height = new SliderViewmodel('Height', c.height, c.heightMin, c.heightMax, 1, subHandler);
	self.width = new SliderViewmodel('Width', c.width, c.widthMin, c.widthMax, 1, subHandler);
	self.initialAngle = new SliderViewmodel('Initial Angle', c.initialAngle, c.angleMin, c.angleMax, 1, subHandler);
	self.deflectAngle = new SliderViewmodel('Deflect Angle', c.deflectAngle, c.angleMin, c.angleMax, 1, subHandler);
	self.lines = new SliderViewmodel('Lines', c.lines, c.linesMin, c.linesMax, 1, subHandler);

	self.sliders = ko.observableArray([
		self.initialAngle, self.deflectAngle, self.lines, self.height, self.width
	]);

	self.canvas = document.getElementById(canvasId);
	self.context = self.canvas.getContext('2d');
	self.useColoredSegments = ko.observable(true);

	//
	//Drawing
	//

	var getEndPoint = function (start, slope) {
		var maxHeight = self.height.value(),
			maxWidth = self.width.value(),
			xIncreasing;

		//We need to know which way the line is travelling
		//Slope doesn't give us the whole story
		//the starting point should be on one of the walls
		//or in a corner. We need to know if we are looking for the limit
		//as X increases or decreases


		



		// yLimit = (maxHeight - start.y) / slope,
		// xLimit = (maxWidth - start.x) / slope;

		console.log('limit', xLimit, yLimit);

		//Corner
		if (yLimit === xLimit) {
			return new Point(maxWidth, maxHeight);
		// Hits top first
		} else if (yLimit > xLimit) {
			return new Point(((maxWidth - start.x) / slope) , maxHeight);
		} else {
			return new Point(maxWidth, ((maxHeight - start.y) / slope));
		}
	};

	var getFutureSlope = function(M, angle) {
		/*
			The original formula for this is:

			Tan(angle) = absolute((m - M) / (1 + mM)

			This means that the negative formula applies when m < M
			and the positive formula applies when m > M

			We just perform both, and compare them the absolute value version
		*/

		var H = Math.degreeTan(angle),
			mLarge = (M + H) / (1 - (M * H)),
			mSmall = (M + -H) / (1 - (M * -H)),
			absoluteLarge = Math.abs((mlarge - M) / (1 + (mLarge * M))),
			absoluteSmall = Math.abs((mSmall - M) / (1 + (mSmall * M)));

		if (mLarge == absoluteLarge)
			return mLarge;
		else if (mSmall == absoluteSmall)
			return mSmall;
		else
			throw new Error('Unable to find slope');		
	};

	var nextSegment = function(previousLine, angle) {
		var futuereSlope = getFutureSlope(previousLine.slope, angle),
			endPoint =  getEndPoint(previousLine.b, futuereSlope),
			nextSegment = new LineSegment(previousLine.b, endPoint);

		return nextSegment;
	};
	
	var drawLines = function() {
		//Setup path
		self.context.beginPath();
		self.context.lineWidth = 1;
		self.context.lineJoin = "round";
		self.context.strokeStyle = 'black';
		
		var linesRemaining = self.lines.value(),
			angle = parseFloat(self.deflectAngle.value()),
			origin = new Point(0,0),
			startingSlope = convertAngleToSlope(self.initialAngle.value()),
			endPoint = getEndPoint(origin, startingSlope),
			line = new LineSegment(origin, endPoint);

		self.context.moveTo(line.a.x, line.a.y);

		console.log('Init Values', {
			angle: angle,
			origin: origin,
			startingSlope: startingSlope,
			endPoint: endPoint,
			line: line

		while(linesRemaining-- > 0) {
			self.context.lineTo(line.b.x, line.b.y);
			self.debugLines.push(new DebugSegment(line));
			line = nextSegment(line, angle);
		};
		
	 	//Finish Path
		self.context.stroke();
		self.context.closePath();
	};
	
	self.draw = function() {

		if (!self.canvas || !self.context)
			return;

		self.context.clearRect(0, 0, self.width.value(), self.height.value());
		self.debugLines.removeAll();
		
		drawLines();
	}.debounce(config.throttle);
};

var vm = new DrawViewmodel('canvas', {
	//Values
	throttle: 50,
	height: 300,
	width: 400,
	initialAngle: 40,
	deflectAngle: 45,
	lines: 2,
	useColoredSegments: false,
	
	//Limits
	angleMin: 1,
	angleMax: 179,

	linesMin: 1,
	linesMax: 100,

	widthMin: 10,
	widthMax: 500,

	heightMin: 10,
	heightMax: 500
});
ko.applyBindings(vm);

vm.draw();