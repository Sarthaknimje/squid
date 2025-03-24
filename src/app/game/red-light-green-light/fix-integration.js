/**
 * Red Light Green Light Game Integration Fix
 * 
 * This script ensures proper integration between the standalone Red Light Green Light game
 * and the Next.js application.
 */

// Function to ensure all required assets are properly loaded
function ensureAssetLoading() {
  // Check if Three.js is loaded
  if (!window.THREE) {
    console.error('THREE.js not loaded properly');
    loadScript('/game/red-light-green-light/three.min.js')
      .then(() => console.log('THREE.js loaded successfully'))
      .catch(err => console.error('Failed to load THREE.js:', err));
  }
  
  // Check if GLTFLoader is loaded
  if (!window.GLTFLoader) {
    console.error('GLTFLoader not loaded properly');
    loadScript('/game/red-light-green-light/GLTFLoader.js')
      .then(() => {
        console.log('GLTFLoader loaded successfully');
        // Make sure GLTFLoader is properly attached to THREE
        if (window.THREE && !window.THREE.GLTFLoader) {
          window.THREE.GLTFLoader = window.GLTFLoader;
        }
      })
      .catch(err => console.error('Failed to load GLTFLoader:', err));
  }
  
  // Check if GSAP is loaded
  if (!window.gsap) {
    console.error('GSAP not loaded properly');
    loadScript('/game/red-light-green-light/gsap.min.js')
      .then(() => console.log('GSAP loaded successfully'))
      .catch(err => console.error('Failed to load GSAP:', err));
  }
}

// Function to load a script and return a promise
function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      console.log(`Script ${src} already loaded`);
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false; // Important to maintain loading order
    
    script.onload = () => {
      console.log(`Loaded script: ${src}`);
      resolve();
    };
    
    script.onerror = (error) => {
      console.error(`Error loading script ${src}:`, error);
      reject(new Error(`Failed to load script: ${src}`));
    };
    
    document.head.appendChild(script);
  });
}

// Function to preload audio files
function preloadAudio() {
  const audioFiles = [
    '/game/red-light-green-light/music/bg.mp3',
    '/game/red-light-green-light/music/win.mp3',
    '/game/red-light-green-light/music/lose.mp3'
  ];
  
  audioFiles.forEach(src => {
    const audio = new Audio();
    audio.src = src;
    // Just load it, don't play
    audio.preload = 'auto';
    audio.load();
    console.log(`Preloading audio: ${src}`);
  });
}

// Function to preload 3D model
function preloadModel() {
  // Create a hidden loader to preload the model
  if (window.THREE && window.GLTFLoader) {
    const loader = new window.GLTFLoader();
    loader.load(
      '/game/red-light-green-light/model/scene.gltf',
      () => console.log('3D model preloaded successfully'),
      xhr => console.log(`3D model loading: ${Math.round((xhr.loaded / xhr.total) * 100)}%`),
      err => console.error('Error preloading 3D model:', err)
    );
  }
}

// Main initialization function
function initializeGameResources() {
  console.log('Initializing Red Light Green Light game resources...');
  
  // Load scripts in sequence
  loadScript('/game/red-light-green-light/three.min.js')
    .then(() => loadScript('/game/red-light-green-light/GLTFLoader.js'))
    .then(() => {
      // Make sure GLTFLoader is properly attached to THREE
      if (window.THREE && !window.THREE.GLTFLoader) {
        window.THREE.GLTFLoader = window.GLTFLoader;
      }
      return loadScript('/game/red-light-green-light/gsap.min.js');
    })
    .then(() => {
      console.log('All scripts loaded successfully');
      preloadAudio();
      preloadModel();
    })
    .catch(err => {
      console.error('Error loading game resources:', err);
      // Try to recover by ensuring individual assets
      ensureAssetLoading();
    });
}

// Export functions for use in the game component
export {
  initializeGameResources,
  loadScript,
  ensureAssetLoading,
  preloadAudio,
  preloadModel
};