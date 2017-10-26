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
var camera = new THREE.PerspectiveCamera(45, width/height, 0.01, 10);
camera.position.z = 5;
scene.add(camera);

/* Create outside box */
var mat = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe:true,
  transparent: true,
  opacity: 0.2
});

// FLOOR
var geometry = new THREE.PlaneGeometry(5, 5, 12, 12);
var floor = new THREE.Mesh( geometry, mat );
floor.rotation.x = Math.PI * 0.5;
scene.add(floor);

// Video screen
var geometry = new THREE.PlaneGeometry(0.2, 0.2);
var mat = new THREE.MeshBasicMaterial({
  color: 0xffffff
});
var videoScreen = new THREE.Mesh( geometry, mat );
videoScreen.position.z = -0.2;
videoScreen.frustumCulled = false;
camera.add(videoScreen);


/* Create a ball to be the hand */
var cursor = new THREE.Group();
scene.add(cursor);
var handGeom = new THREE.SphereGeometry(0.01);
var handMat = new THREE.MeshBasicMaterial({color:0xff0000, transparent: true});
var hand = new THREE.Mesh(handGeom, handMat);
cursor.add(hand);

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
var outputCamera;
function render(a) {
  if (running) {
    vrDisplay.requestAnimationFrame(render);
    controller = getController();
    if(controller) {
        cursor.position.fromArray(controller.pose.position);
        cursor.quaternion.fromArray(controller.pose.orientation);
    }
    outputCamera = updateCamera(camera);
    renderer.render(scene, outputCamera);
    vrDisplay.submitFrame();
  }
}

var videoTexture;
function onVideoSuccess (stream) {
    var video = document.createElement('video');
    var videoTracks = stream.getVideoTracks();
    window.stream = stream;
    video.srcObject = stream;
    video.play();

    videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;
    videoScreen.material.map = videoTexture;
    videoScreen.material.needsUpdate = true;
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
        /* WHEN RUNING, TRY TO ACCESS THE CAMERA */
        var video = document.querySelector('video');
        var constraints = window.constraints = {
            audio: false,
            video: true
        };
        navigator.mediaDevices.getUserMedia(constraints).
            then(onVideoSuccess)
            .catch(function () {
                console.log('ERROR');
                console.log(arguments);
            });
        // Start VR
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
