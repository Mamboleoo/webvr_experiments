console.clear();
var frameData = null;
var vrDisplay;
var startButton = document.querySelector('.start');
var stopButton = document.querySelector('.stop');

var loader = new THREE.TextureLoader();
var dotMap = loader.load('/_assets/img/dotTexture.png');

/* Init ThreeJs */
var renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(2);
var width = window.innerWidth;
var height = window.innerHeight;
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

/* Create a scene and a camera */
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 50);
camera.position.z = 5;

/* Create outside box */
var boundingGeom = new THREE.BoxGeometry(2,2,2,8,8,8);
var mat = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe:true,
  transparent: true,
  opacity: 0.2
});
// scene.add(new THREE.Mesh(boundingGeom, mat));

// FLOOR
var geometry = new THREE.PlaneGeometry(5, 5, 12, 12);
var plane = new THREE.Mesh( geometry, mat );
plane.rotation.x = Math.PI * 0.5;
scene.add(plane);

// var axisHelper = new THREE.AxisHelper( 1 );
// scene.add( axisHelper );

var dotsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size:0.005,
    transparent: true,
    map: dotMap,
    vertexColors: THREE.VertexColors
});
var linesMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff
});
var tempDots = new THREE.Geometry();
var tempLines = new THREE.Geometry();
var dots = new THREE.Points(new THREE.Geometry(), dotsMaterial);
var tempLine = new THREE.Line(tempLines.clone(), linesMaterial);
var lines = new THREE.Group();
scene.add(dots);
scene.add(tempLine);
scene.add(lines);

var drawDot = true;

function addLineVector(position) {
    var newVector = new THREE.Vector3(position[0], position[1], position[2]);
    if (drawDot) {
        tempDots.vertices.push(newVector);
        tempDots.colors.push(handMat.color.clone());
        dots.geometry = tempDots.clone();
    } else {
        tempLines.vertices.push(newVector);
        tempLine.geometry = tempLines.clone();
    }
}
function addLine() {
    var line = new THREE.Line(tempLines.clone(), linesMaterial.clone());
    lines.add(line);

    tempLine.geometry.vertices = [];
    tempLine.geometry.verticesNeedUpdate = true;
}

/* Create a ball to be the hand */
var cursor = new THREE.Group();
scene.add(cursor);
var handGeom = new THREE.SphereGeometry(0.01);
var handMat = new THREE.MeshBasicMaterial({color:0xff0000, transparent: true});
var hand = new THREE.Mesh(handGeom, handMat);
cursor.add(hand);
var cursorDotsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size:0.002,
    transparent: true,
    map: dotMap
});
var cursorDotsGeom = new THREE.Geometry();
cursorDotsGeom.vertices = [
    new THREE.Vector3(0,0.02,0)
];
var cursorDots = new THREE.Points(cursorDotsGeom, cursorDotsMaterial);
cursor.add(cursorDots);

var cursorLinesMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff
});
var cursorLinesGeom = new THREE.Geometry();
cursorLinesGeom.vertices = [
    new THREE.Vector3(0,0.015,0),
    new THREE.Vector3(0,0.022,0)
];
var cursorLines = new THREE.LineSegments(cursorLinesGeom, cursorLinesMaterial);
cursorLines.visible = false;
cursor.add(cursorLines);

/* Create a left and a right camera */
var cameraL = new THREE.PerspectiveCamera();
cameraL.bounds = new THREE.Vector4( 0.0, 0.0, 0.5, 1.0 );
cameraL.layers.enable(1);
cameraL.near = camera.near;
cameraL.far = camera.far;

var cameraR = new THREE.PerspectiveCamera();
cameraR.bounds = new THREE.Vector4( 0.5, 0.0, 0.5, 1.0 );
cameraR.layers.enable(2);
cameraR.near = camera.near;
cameraR.far = camera.far;

/* Create a camera that combines both eyes */
var cameraVR = new THREE.ArrayCamera([cameraL, cameraR]);

function updateCamera () {
  vrDisplay.getFrameData(frameData);

  var pose = frameData.pose;

  camera.position.fromArray( pose.position );
  camera.quaternion.fromArray( pose.orientation );
  camera.updateMatrixWorld();

  cameraL.matrixWorldInverse.fromArray( frameData.leftViewMatrix );
  cameraR.matrixWorldInverse.fromArray( frameData.rightViewMatrix );

  cameraL.projectionMatrix.fromArray( frameData.leftProjectionMatrix );
  cameraR.projectionMatrix.fromArray( frameData.rightProjectionMatrix );

  // HACK @mrdoob
  // https://github.com/w3c/webvr/issues/203
  cameraVR.projectionMatrix.copy( cameraL.projectionMatrix );

  return cameraVR;
}

// Tries to get any controller
function getController() {
    var gamepads = navigator.getGamepads && navigator.getGamepads();
    if(gamepads.length) {
        var gamepad = gamepads[0];
        return gamepad;
    }
    return false;
}

var controller = null;
var center = new THREE.Vector2(0, 0);
var colorAngle = new THREE.Vector2(0, 0);
var color = new THREE.Color();
var triggers = [false, false];
var delay = 40;
var prevA = 0;
function render(a) {
  if (running) {
    vrDisplay.requestAnimationFrame(render);
    controller = getController();
    if(controller) {
        cursor.position.fromArray(controller.pose.position);
        cursor.quaternion.fromArray(controller.pose.orientation);
        if (controller.axes[0] !== 0) {
            colorAngle.x = controller.axes[0];
            colorAngle.y = controller.axes[1];
            var angle = (colorAngle.angle()) / (Math.PI * 2);
            color.setHSL(angle, 1, 0.5);
            handMat.color.setRGB(color.r, color.g, color.b);
            linesMaterial.color = handMat.color;
        }

        // If front trigger is pressed
        if (controller.buttons[0].pressed) {
            if (!triggers[0]) {
                triggers[0] = true;
                drawDot = !drawDot;
                if (drawDot) {
                    cursorDots.visible = true;
                    cursorLines.visible = false;
                } else {
                    cursorDots.visible = false;
                    cursorLines.visible = true;
                }
            }
        } else if (triggers[0]) {
            triggers[0] = false;
        }

        if (a - prevA > delay) {
            // If back trigger is pressed
            if (controller.buttons[1].pressed) {
                // Vibration
                if (controller.hapticActuators[0].pulse) {
                    // controller.hapticActuators[0].pulse(1,1);
                }
                addLineVector(controller.pose.position);
                triggers[1] = true;
            } else {
                if (triggers[1]) {
                    triggers[1] = false;
                    console.log('Released');
                    if (!drawDot) {
                        addLine();
                        tempLines.vertices = [];
                    }
                }
            }
            prevA = a;
        }
    }
    camera = updateCamera(camera);
    renderer.render(scene, camera);
    vrDisplay.submitFrame();
  }
}

var running = false;
if(navigator.getVRDisplays){
  /* If browser support WebVR */
  navigator.getVRDisplays().then(function(displays) {
    console.log(displays);
    if (displays.length === 0) {
      return;
    }
    frameData = new VRFrameData();
    vrDisplay = displays[0];

    /* Start VR when user press Start */
    startButton.addEventListener('click', function() {
      vrDisplay.requestPresent([{ source: renderer.domElement }]).then(function() {
        running = true;
        vrDisplay.requestAnimationFrame(render);
      });
    });

    /* When user wants to exit the VR */
    stopButton.addEventListener('click', function() {
      vrDisplay.exitPresent().then(function(){
        running = false;
        resetCamera();
        requestAnimationFrame(noVRRender);
      });
    });
  });
}

function resetCamera() {
  camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 50);
  camera.position.z = 5;
  controls = new THREE.OrbitControls(camera, renderer.domElement);
}

function noVRRender() {
  if (!running) {
    requestAnimationFrame(noVRRender);
  }
  renderer.render(scene, camera);
}
controls = new THREE.OrbitControls(camera, renderer.domElement);
requestAnimationFrame(noVRRender);


// Iterate across gamepads as Vive Controllers may not be
// in position 0 and 1.
