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
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

/* Create a scene and a camera */
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(70, width/height, 0.1, 20);
camera.position.z = 5;

// FLOOR
var geometry = new THREE.PlaneGeometry(5, 5, 12, 12);
var mat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
    roughness: 1.0,
    metalness: 0.0
});
var floor = new THREE.Mesh( geometry, mat );
floor.rotation.x = -Math.PI * 0.5;
floor.receiveShadow = true;
scene.add(floor);

// var axisHelper = new THREE.AxisHelper( 1 );
// scene.add( axisHelper );

scene.add( new THREE.HemisphereLight( 0x808080, 0x606060 ) );
var light = new THREE.DirectionalLight( 0xffffff );
light.position.set( 0, 6, 0 );
light.castShadow = true;
light.shadow.camera.top = 2;
light.shadow.camera.bottom = -2;
light.shadow.camera.right = 2;
light.shadow.camera.left = -2;
light.shadow.mapSize.set( 4096, 4096 );
scene.add( light );

/* Create Cubes to drag & drop */
var cubeGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
var cubes = new THREE.Group();
scene.add(cubes);
var cubeAmount = 40;
for(var i=0;i<40;i++) {
    var cubeMat = new THREE.MeshStandardMaterial( {
        color: Math.random() * 0xffffff,
        roughness: 0.7,
        metalness: 0.0,
        transparent: true
    } );
    var cube = new THREE.Mesh(cubeGeom, cubeMat);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.position.set(3*(Math.random()-0.5),2*Math.random(),3*(Math.random()-0.5))
    cubes.add(cube);
}

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

function resetCenterRoom() {
    vrDisplay.resetPose();
}

var distance;
var isCubeHover = false;
var hoveredCube = null;
var grabbedCube = null;
function checkControllerDistance () {
    var cube;
    isCubeHover = false;
    hoveredCube = null;
    for(var i=0;i<40;i++) {
        cube = cubes.children[i]
        distance = cursor.position.distanceTo(cube.position);
        // If close to cube
        if (distance < 0.22) {
            // If cube wasn't hovered before
            if (!isCubeHover) {
                cube.material.opacity = 0.8;
                isCubeHover = true;
                hoveredCube = i;
            }
        } else {
            // If cube was hovered before
            cube.material.opacity = 1;
        }
    }
}

var move = new THREE.Vector3();
var rotate = new THREE.Euler();
function moveCube () {
    move = move.copy(cursor.position).sub(prevController);
    cubes.children[grabbedCube].position.add(move);
    cubes.children[grabbedCube].quaternion.fromArray(controller.pose.orientation);
}

var controller = null;
var triggers = [false, false, false];
var delay = 40;
var prevA = 0;
var prevController = new THREE.Vector3();
function render(a) {
  if (running) {
    vrDisplay.requestAnimationFrame(render);
    controller = getController();
    if(controller) {
        cursor.position.fromArray(controller.pose.position);
        cursor.quaternion.fromArray(controller.pose.orientation);

        // Touch front button
        if (controller.buttons[0].pressed) {
            if (!triggers[0]) {
                triggers[0] = true;
            }
        } else if (triggers[0]) {
            triggers[0] = false;
        }

        // Back button
        if (controller.buttons[1].pressed) {
            if (!triggers[1]) {
                triggers[1] = true;
                if (hoveredCube) {
                    grabbedCube = hoveredCube;
                }
                prevController.copy(cursor.position);
            }
        } else if (triggers[1]) {
            triggers[1] = false;
            grabbedCube = null;
        }
        // Lateral button
        if (controller.buttons[2].pressed) {
            if (!triggers[2]) {
                triggers[2] = true;
                resetCenterRoom();
            }
        } else if (triggers[2]) {
            triggers[2] = false;
        }
    }
    if (grabbedCube === null) {
        checkControllerDistance();
    }
    if (triggers[1] && grabbedCube !== null) {
        moveCube();
        prevController.copy(cursor.position);
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
