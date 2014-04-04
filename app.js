window.requestAnimFrame = 
  window.requestAnimationFrame || 
  window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame || 
  window.msRequestAnimationFrame || 
  function (callback) {
    window.setTimeout(callback, 1000 / 60);
  };

var DebugSegment = function(start, finish, control) {
  this.output = 'Start: ' + start.x + ', ' + start.y
                + ', Finish: ' + finish.x + ', ' + finish.y
                + ', Control: ' + control.x + ', ' + control.y
};

var DebugOutput = function(output) {
  this.output = output;
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
  self.curveRateMin = ko.observable(0);
  self.curveRateMax = ko.observable(0);
  
  self.curveStepMin = ko.observable(0);
  self.curveStepMax = ko.observable(0);
  
  self.curvesMin = ko.observable(0);
  self.curvesMax = ko.observable(0);
  
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
      self.drawCurve();
  });
  
  self.width = ko.observable(0).extend({ rateLimit: config.rateLimit });
  self.width.subscribe(function(newValue) {
    if (!self.canvas) return;
      self.canvas.width = newValue;
      self.drawCurve();
  });
  
  //
  //Drawable Properties
  //
  self.curveRate = ko.observable(0).extend({ rateLimit: config.rateLimit });
  self.curveRate.subscribe(function(newValue) {
     if (!self.canvas) return;
      self.drawCurve();
  });
  self.curveStep = ko.observable(0).extend({ rateLimit: config.rateLimit });
  self.curveStep.subscribe(function(newValue) {
     if (!self.canvas) return;
      self.drawCurve();
  });
  self.curves = ko.observable(0).extend({ rateLimit: config.rateLimit });
  self.curves.subscribe(function(newValue) {
     if (!self.canvas) return;
      self.drawCurve();
  });
  self.useColoredSegments = ko.observable(true)
                              .extend({ rateLimit: config.rateLimit });

  //
  //Draw
  //
  var xIncreasing = true,
      yIncreasing = true,
      lift = true,
      curvesRemaining;
  
  var getReflection = function(size, source) {
    return (size / 2) + ((size / 2) - source)
  };
  
  var getNextPoint = function(previous) {
    var yBoost = 0,
        xBoost = 0,
        boostFactor = parseFloat(self.curveStep()) +
                      parseFloat(self.curveRate());

    if (xIncreasing && yIncreasing) { //Bottom Right
      yBoost = -boostFactor;
    } else if (xIncreasing) { //Top right
      yBoost = boostFactor;
    } else if (yIncreasing) { //Bottom Left
      xBoost = boostFactor;
    } else { //Both decreasing, Top Left
      xBoost = -boostFactor;
    }

    return {
      x: getReflection(self.width(), previous.x) + xBoost,
      y: getReflection(self.height(), previous.y) + yBoost
    };
  };
  
  var getControlPoint = function(start, finish) {    
    var midPoint = {
      x: (start.x + finish.x) / 2,
      y: (start.y + finish.y) / 2
    },
        boost =  parseFloat(self.curveRate());
    
    if (xIncreasing && yIncreasing) { //Bottom Right
      midPoint.y += -boost;
    } else if (xIncreasing) { //Top right
      midPoint.x += boost;
    } else if (yIncreasing) { //Bottom Left
      midPoint.y += boost;
    } else { //Both decreasing, Top Left
      midPoint.x += -boost;
    }
    
    return midPoint;
  };
  
  var setDirection = function(start, finish) {
    
    //You hit a corner exactly, you little shit
    if ((finish.x == 0 || finish.x == self.width())
       && (finish.y == 0 || finish.y == self.height())) {
      self.debugLines.push(new DebugOutput('Figure something out'));
     
      
    }
    
    if (finish.x == 0 || finish.x == self.width()) { //left/right wall
        xIncreasing = !xIncreasing;
    } else { //up/down wall
      yIncreasing = !yIncreasing;
    }
  };
  
  var drawSegment = function(start) {
    var finish, cp;
    
    self.context.moveTo(start.x, start.y);
    finish = getNextPoint(start);
    
    cp = getControlPoint(start, finish);
    self.context.quadraticCurveTo(cp.x, cp.y, finish.x, finish.y);
    
    self.debugLines.push(new DebugSegment(start, finish, cp));
    
    setDirection(start, finish);
    
    return finish;
  };
  
  var draw = function() {
    //Setup path
    self.context.beginPath();
    self.context.lineWidth = 1;
    self.context.lineJoin = "round";        
    self.context.strokeStyle = 'black';
    
    var point = {x: 0, y: 0};    
    
    while(curvesRemaining-- > 0) {
        point = drawSegment(point);
    };
    
   //Finish Path
    self.context.stroke();
    self.context.closePath();
  };
  
  self.drawCurve = function() {
    self.context.clearRect(0, 0, self.width(), self.height());
    self.debugLines.removeAll();
    curvesRemaining = self.curves();
    draw();
  };

  //
  //Init
  //
  self.init = function() {
    self.height(config.height);
    self.width(config.width);
    self.curveRate(config.curveRate);
    self.curveStep(config.curveStep);
    self.curves(config.curves);
    self.useColoredSegments(config.useColoredSegments || true);
    
    self.curveRateMin(config.curveRateMin || -10);
    self.curveRateMax(config.curveRateMax || 10);
    self.curveStepMin(config.curveStepMin || -40);
    self.curveStepMax(config.curveStepMax || 40);
    self.curvesMin(config.curvesMin || 0);
    self.curvesMax(config.curvesMax || 100);
    self.widthMin(config.widthMin || 0);
    self.widthMax(config.widthMax || 500);
    self.heightMin(config.heightMin || 0);
    self.heightMax(config.heightMax || 500);
    
    self.canvas = document.getElementById(canvasId);
    self.context = self.canvas.getContext('2d');

    self.drawCurve();
  };
};

var vm = new DrawViewmodel('canvas', {
  //Values
  rateLimit: 50,
  height: 300,
  width: 400,
  curveRate: 20,
  curveStep: 5,
  curves: 10,
  useColoredSegments: true,
  
  //Limits
  curveRateMin: -50,
  curveRateMax: 50,

  curveStepMin: -40,
  curveStepMax: 40,

  curvesMin: 0,
  curvesMax: 100,

  widthMin: 0,
  widthMax: 500,

  heightMin: 0,
  heightMax: 500
});
ko.applyBindings(vm);
vm.init();