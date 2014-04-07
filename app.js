window.requestAnimFrame = 
	window.requestAnimationFrame || 
	window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame || 
	window.msRequestAnimationFrame || 
	function (callback) {
		window.setTimeout(callback, 1000 / 60);
	};

var DebugSegment = function(start, finish) {
	this.output = 'Start: ' + start.x + ', ' + start.y
								+ ', Finish: ' + finish.x + ', ' + finish.y;
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

//getTanDeg(angle) = slope

function getSlope(p1, p2) {
	return (p2.y - p1.y) / (p2.x - p1.x);
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
	return {
		x: Math.floor(x),
		y: Math.floor(y)
	};
};

var getMidPoint = function(p1, p2) {
	return new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
};

var DrawViewmodel = function(canvasId, config) {
	var self = this;
	//Canvas properties
	self.canvas = null;
	self.context = null;
	
	self.debugLines = ko.observableArray();
	
	//
	//Ranges
	//
	self.deflectAngleMin = ko.observable(0);
	self.deflectAngleMax = ko.observable(0);
	
	self.linesMin = ko.observable(0);
	self.linesMax = ko.observable(0);
	
	self.widthMin = ko.observable(0);
	self.widthMax = ko.observable(0);
	
	self.heightMin = ko.observable(0);
	self.heightMax = ko.observable(0);
	
	//
	//Bind board size
	//
	self.height = ko.observable(0).extend({ rateLimit: config.rateLimit });
	self.height.subscribe(function(newValue) {
		if (!self.canvas) return;
			self.canvas.height = newValue;
			self.draw();
	});
	
	self.width = ko.observable(0).extend({ rateLimit: config.rateLimit });
	self.width.subscribe(function(newValue) {
		if (!self.canvas) return;
			self.canvas.width = newValue;
			self.draw();
	});
	
	//
	//Drawable Properties
	//
	self.deflectAngle = ko.observable(0).extend({ rateLimit: config.rateLimit });
	self.deflectAngle.subscribe(function(newValue) {
		 if (!self.canvas) return;
			self.draw();
	});
	self.lines = ko.observable(0).extend({ rateLimit: config.rateLimit });
	self.lines.subscribe(function(newValue) {
		 if (!self.canvas) return;
			self.draw();
	});
	self.useColoredSegments = ko.observable(true).extend({ rateLimit: config.rateLimit });

	//
	//Draw
	//
	var xIncreasing = true,
			yIncreasing = true,
			lift = true,
			linesRemaining;
	
	var getReflection = function(size, source) {
		return (size / 2) + ((size / 2) - source)
	};
	
	var getNextPoint = function(previous) {
		var yBoost = 0,
				xBoost = 0,
				boostFactor = parseFloat(self.deflectAngle());

		if (xIncreasing && yIncreasing) { //Bottom Right
			yBoost = -boostFactor;
		} else if (xIncreasing) { //Top right
			yBoost = boostFactor;
		} else if (yIncreasing) { //Bottom Left
			xBoost = boostFactor;
		} else { //Both decreasing, Top Left
			xBoost = -boostFactor;
		}

		return new Point(getReflection(self.width(), previous.x) + xBoost, getReflection(self.height(), previous.y) + yBoost);
	};
	
	var setDirection = function(start, finish) {
		
		//You hit a corner exactly, you little shit
		if ((finish.x == 0 || finish.x == self.width())
			 && (finish.y == 0 || finish.y == self.height())) {
			self.debugLines.push(new DebugOutput('Corner Hit'));
		}
		
		if (finish.x == 0 || finish.x == self.width()) { // left or right wall
				xIncreasing = !xIncreasing;
		} else { // up or down wall
			yIncreasing = !yIncreasing;
		}
	};
	
	var drawSegment = function(start) {
		var finish, cp;
		
		self.context.moveTo(start.x, start.y);
		finish = getNextPoint(start);
		
		self.context.lineTo(finish.x, finish.y);
		
		self.debugLines.push(new DebugSegment(start, finish));
		
		setDirection(start, finish);
		
		return finish;
	};
	
	var drawLines = function() {
		//Setup path
		self.context.beginPath();
		self.context.lineWidth = 1;
		self.context.lineJoin = "round";
		self.context.strokeStyle = 'black';
		
		var point = {x: 0, y: 0};    
		
		while(linesRemaining-- > 0) {
				point = drawSegment(point);
		};
		
	 //Finish Path
		self.context.stroke();
		self.context.closePath();
	};
	
	self.draw = function() {
		self.context.clearRect(0, 0, self.width(), self.height());
		self.debugLines.removeAll();
		linesRemaining = self.lines();
		drawLines();
	};

	//
	//Init
	//
	self.init = function() {
		self.height(config.height);
		self.width(config.width);
		self.deflectAngle(config.deflectAngle);
		self.lines(config.lines);
		self.useColoredSegments(config.useColoredSegments || true);
		
		self.deflectAngleMin(config.deflectAngleMin || 1);
		self.deflectAngleMax(config.deflectAngleMax || 179);
		self.linesMin(config.linesMin || 0);
		self.linesMax(config.linesMax || 100);
		self.widthMin(config.widthMin || 0);
		self.widthMax(config.widthMax || 500);
		self.heightMin(config.heightMin || 0);
		self.heightMax(config.heightMax || 500);
		
		self.canvas = document.getElementById(canvasId);
		self.context = self.canvas.getContext('2d');

		self.draw();
	};
};

var vm = new DrawViewmodel('canvas', {
	//Values
	rateLimit: 50,
	height: 300,
	width: 400,
	deflectAngle: 90,
	lines: 10,
	useColoredSegments: true,
	
	//Limits
	deflectAngleMin: 1,
	deflectAngleMax: 179,

	linesMin: 0,
	linesMax: 100,

	widthMin: 0,
	widthMax: 500,

	heightMin: 0,
	heightMax: 500
});
ko.applyBindings(vm);
vm.init();