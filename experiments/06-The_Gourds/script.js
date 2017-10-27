console.clear();
var frameData = null;
var vrDisplay;
var startButton = document.querySelector('.start');
var stopButton = document.querySelector('.stop');

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

// FLOOR
var mat = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe:true,
  transparent: true,
  opacity: 0.2
});
var geometry = new THREE.PlaneGeometry(5, 5, 12, 12);
var plane = new THREE.Mesh( geometry, mat );
plane.rotation.x = Math.PI * 0.5;
scene.add(plane);

// var axisHelper = new THREE.AxisHelper( 1 );
// scene.add( axisHelper );

var light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
scene.add( light );

// Create a dumb cursor
var cursorGeom = new THREE.SphereGeometry(0.01);
var cursorMat = new THREE.MeshBasicMaterial({color: 0xff0000});
var cursor = new THREE.Mesh(cursorGeom, cursorMat);
scene.add(cursor)

var mtlLoader = new THREE.MTLLoader();
mtlLoader.load( 'tex.mtl', function( materials ) {
    materials.preload();
    var objLoader = new THREE.OBJLoader();
    objLoader.setMaterials( materials );
    objLoader.load( 'mesh.obj', function ( object ) {
        var gourds = object.children[0]
        gourds.geometry.computeBoundingSphere();
        gourds.scale.set(0.05, 0.05, 0.05);
        gourds.rotation.x = -Math.PI / 2;
        scene.add(gourds);
    });
});

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
var triggers = [false, false];

function render(a) {
  if (running) {
    vrDisplay.requestAnimationFrame(render);
    controller = getController();
    if(controller) {
        cursor.position.fromArray(controller.pose.position);
        cursor.quaternion.fromArray(controller.pose.orientation);
        if (controller.buttons[1].pressed && !triggers[1]) {
            vrDisplay.resetPose();
            console.log("resertd");
            triggers[1] = true;
        } else if (triggers[1]) {
            triggers[1] = false;
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
