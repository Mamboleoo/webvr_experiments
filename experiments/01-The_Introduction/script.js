console.clear();
var frameData = new VRFrameData();
var vrDisplay;
var btn = document.querySelector('.start');
var frameData = new VRFrameData();


/* THREEJS */
var renderer = new THREE.WebGLRenderer();
var width = 500;
var height = 500;
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
camera.position.z = 30;

var cube = new THREE.Mesh(new THREE.BoxGeometry(10,10,10), new THREE.MeshBasicMaterial());
scene.add(cube);

function render() {
  window.requestAnimationFrame(render);
  vrDisplay.getFrameData(frameData);
  cube.rotation.y += 0.01;
  cube.rotation.z += 0.01;
  renderer.render(scene, camera);
  vrDisplay.submitFrame();
}

var canvas = renderer.domElement;

navigator.getVRDisplays().then(function(displays) {
  vrDisplay = displays[0];
  console.log('Display found');
  // Starting the presentation when the button is clicked: It can only be called in response to a user gesture
  btn.addEventListener('click', function() {
    vrDisplay.requestPresent([{ source: canvas }]).then(function() {
      render();
    });
  });
});
