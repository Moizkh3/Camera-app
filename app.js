// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const preview = document.getElementById('preview');
const filterButtons = document.querySelectorAll('.filter-btn');
const captureBtn = document.getElementById('captureBtn');
const downloadBtn = document.getElementById('downloadBtn');
const flipCameraBtn = document.getElementById('flipCamera');
const previewContainer = document.querySelector('.preview-container');
const shutterSound = document.getElementById('shutterSound');
const soundToggle = document.getElementById('soundToggle');

// Set initial sound volume
shutterSound.volume = 0.3;

// Global variables
let currentStream = null;
let facingMode = 'user'; // Start with front camera
let currentMode = 'single';
let photoCount = 0;
const MAX_PHOTOS = 3;
let capturedPhotos = [];

// Initialize the camera
async function initializeCamera() {
    try {
        // Stop any existing stream
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        // Get camera stream
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        currentStream = stream;

        // Show flip camera button only if multiple cameras are available
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        flipCameraBtn.style.display = videoDevices.length > 1 ? 'block' : 'none';

    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Error accessing camera. Please make sure you have granted camera permissions.');
    }
}

// Reset photo strip function
function resetPhotoStrip() {
    photoCount = 0;
    capturedPhotos = [];
    previewContainer.classList.remove('show');
    previewContainer.style.display = 'none';
    document.getElementById('singleShotPreviewTitle').style.display = 'none';
    document.getElementById('singleShotImageWrapper').style.display = 'none';
    document.getElementById('photoStripPreviewTitle').style.display = 'none';
    document.getElementById('photoStrip').style.display = 'none';
    const stripCanvas = document.getElementById('stripCanvas');
    const ctx = stripCanvas.getContext('2d');
    ctx.clearRect(0, 0, stripCanvas.width, stripCanvas.height);
}

// Initialize the app
function init() {
    // Set up thumbnail click handler
    const thumbnail = document.querySelector('.preview-thumbnail');
    thumbnail.addEventListener('click', () => {
        const downloadLink = document.getElementById('downloadBtn');
        downloadLink.click();
    });
    // Set up sound toggle
    soundToggle.addEventListener('change', () => {
        shutterSound.volume = soundToggle.checked ? 0.3 : 0;
    });

    // Start camera
    initializeCamera();

    // Mode selection handling
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            resetPhotoStrip();
            document.getElementById('captureCount').style.display = 
                currentMode === 'strip' ? 'block' : 'none';
        });
    });

    // Set up filter buttons
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            // Remove all filters from video
            video.className = '';
            // Add selected filter
            const filter = btn.dataset.filter;
            if (filter !== 'none') {
                video.classList.add(`filter-${filter}`);
            }

            // Reset photo strip when filter changes
            resetPhotoStrip();
        });
    });

    // Set up capture button
    captureBtn.addEventListener('click', capturePhoto);

    // Set up download button
    downloadBtn.addEventListener('click', downloadPhoto);

    // Set up flip camera button
    flipCameraBtn.addEventListener('click', flipCamera);
}

// Flash effect function
function triggerFlash() {
    const flash = document.querySelector('.flash');
    flash.style.animation = 'none';
    flash.offsetHeight; // Trigger reflow
    flash.style.animation = 'flash 0.5s';
}

// Update thumbnail preview
function updateThumbnail(photoData) {
    const thumbnail = document.querySelector('.preview-thumbnail');
    const lastPhoto = document.getElementById('lastPhoto');
    lastPhoto.src = photoData;
    thumbnail.classList.add('show');
}

// Capture photo function
function capturePhoto() {
    if (currentMode === 'strip' && photoCount >= MAX_PHOTOS) {
        alert('Photo strip is full! Download your photos or start over.');
        return;
    }

    // Trigger flash effect
    triggerFlash();

    // Play shutter sound if enabled
    if (soundToggle.checked) {
        shutterSound.play();
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas with filter
    const context = canvas.getContext('2d');
    const filterStyle = getComputedStyle(video).filter;
    context.filter = filterStyle;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.filter = 'none'; // Reset context filter

    if (currentMode === 'single') {
        // Update preview for single photo
        const timestamp = new Date().getTime();
        const photoData = canvas.toDataURL('image/png');
        updateThumbnail(photoData);
        showSingleShotPreview(photoData);
        downloadBtn.href = photoData;
        downloadBtn.download = `photo_${timestamp}.png`;
    } else {
        // Store the captured photo
        capturedPhotos.push(canvas.toDataURL('image/png'));
        photoCount++;
        document.getElementById('photoCount').textContent = photoCount;

        // Create photo strip if we have all photos
        if (photoCount === MAX_PHOTOS) {
            createPhotoStrip();
        }
    }

    // Add capture animation
    video.style.transform = 'scale(0.95)';
    setTimeout(() => {
        video.style.transform = 'scale(1)';
    }, 200);
}

// Create photo strip function
function createPhotoStrip() {
    const stripCanvas = document.getElementById('stripCanvas');
    const ctx = stripCanvas.getContext('2d');
    const targetWidth = 800; // Fixed width for the strip
    const aspectRatio = video.videoWidth / video.videoHeight;
    const photoWidth = targetWidth;
    const photoHeight = targetWidth / aspectRatio;
    const spacing = 20;

    // Set strip canvas dimensions for vertical layout
    stripCanvas.width = photoWidth;
    stripCanvas.height = (photoHeight * MAX_PHOTOS) + (spacing * (MAX_PHOTOS - 1));

    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, stripCanvas.width, stripCanvas.height);

    // Draw each photo onto the strip vertically with animation
    showPhotoStripPreview();

    // Draw each photo onto the strip vertically
    capturedPhotos.forEach((photoData, index) => {
        const img = new Image();
        img.onload = () => {
            const y = index * (photoHeight + spacing);
            // Add white border effect
            ctx.fillStyle = 'white';
            ctx.fillRect(0, y - spacing/2, photoWidth, spacing);
            // Draw the photo with current filter
            const activeFilter = document.querySelector('.filter-btn.active');
            if (activeFilter && activeFilter.dataset.filter !== 'none') {
                ctx.filter = getComputedStyle(video).filter;
            }
            ctx.drawImage(img, 0, y, photoWidth, photoHeight);
            ctx.filter = 'none';

            // Update thumbnail with the last photo
            if (index === MAX_PHOTOS - 1) {
                updateThumbnail(photoData);
            }
            ctx.drawImage(img, 0, y, photoWidth, photoHeight);
        };
        img.src = photoData;
    });
}

// Download photo strip function
function downloadPhoto() {
    const stripCanvas = document.getElementById('stripCanvas');
    const link = document.createElement('a');
    link.download = `photo-strip-${new Date().toISOString()}.png`;
    link.href = stripCanvas.toDataURL('image/png');
    link.click();
}

// Flip camera function
async function flipCamera() {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    await initializeCamera();
}

// Start the app when the page loads
window.addEventListener('load', init);

// Handle visibility change to restart camera when tab becomes visible
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        initializeCamera();
    }
});

function showSingleShotPreview(photoData) {
    // Show preview container
    previewContainer.classList.add('show');
    previewContainer.style.display = 'block';
    // Show single shot preview title and image
    document.getElementById('singleShotPreviewTitle').style.display = '';
    document.getElementById('singleShotImageWrapper').style.display = '';
    document.getElementById('singleShotImage').src = photoData;
    // Hide photo strip preview title and canvas
    document.getElementById('photoStripPreviewTitle').style.display = 'none';
    document.getElementById('photoStrip').style.display = 'none';
    // Change download button text
    downloadBtn.innerHTML = '<i class="fas fa-download" aria-hidden="true"></i> Download Photo';
}

function showPhotoStripPreview() {
    previewContainer.classList.add('show');
    previewContainer.style.display = 'block';
    document.getElementById('singleShotPreviewTitle').style.display = 'none';
    document.getElementById('singleShotImageWrapper').style.display = 'none';
    document.getElementById('photoStripPreviewTitle').style.display = '';
    document.getElementById('photoStrip').style.display = '';
    downloadBtn.innerHTML = '<i class="fas fa-download" aria-hidden="true"></i> Download Photo Strip';
}