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

/* Create outside box */
var boundingGeom = new THREE.BoxGeometry(2,2,2,8,8,8);
var mat = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe:true,
  transparent: true,
  opacity: 0.2
});
scene.add(new THREE.Mesh(boundingGeom, mat));

/* Create a bunch of boxes inside the matrix */
var amount = 100;
var cubes = new THREE.Group();
scene.add(cubes);
for(var i=0;i<amount;i++){
  var x = (Math.random()-0.5) * 2;
  var y = (Math.random()-0.5) * 2;
  var z = (Math.random()-0.5) * 2;
  var material = new THREE.MeshBasicMaterial({
    color: new THREE.Color('hsl('+(y+1)*180+',50%, 50%)'),
    side: THREE.DoubleSide
  });
  var cube = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,0.2), material);
  cube.position.set(x, y, z);
  cubes.add(cube);
}

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

function render(a) {
  if (running) {
    vrDisplay.requestAnimationFrame(render);
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
      noVR();
      return;
    }
    frameData = new VRFrameData();
    vrDisplay = displays[0];
    // Starting the presentation when the button is clicked: It can only be called in response to a user gesture
    startButton.addEventListener('click', function() {
      vrDisplay.requestPresent([{ source: renderer.domElement }]).then(function() {
        running = true;
        vrDisplay.requestAnimationFrame(render);
      });
    });// Starting the presentation when the button is clicked: It can only be called in response to a user gesture
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
