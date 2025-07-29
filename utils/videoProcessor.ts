// utils/videoProcessor.ts

const NUM_FRAMES = 5; // Number of frames to extract from the video

/**
 * Extracts a specified number of frames from a video file.
 * @param videoFile The video file to process.
 * @returns A promise that resolves with an array of base64-encoded image data URLs (JPEGs).
 */
export const extractFramesFromVideo = (videoFile: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames: string[] = [];

    if (!context) {
      return reject(new Error('Canvas 2D context is not available.'));
    }

    video.preload = 'metadata';
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.muted = true; // Necessary for autoplay to work in some browsers

      const duration = video.duration;
      if (duration === 0 || !isFinite(duration)) {
          URL.revokeObjectURL(videoUrl);
          return reject(new Error("Video has no duration or is invalid."));
      }
      
      const interval = duration / (NUM_FRAMES + 1);
      let currentTime = interval;
      let framesExtracted = 0;

      const seekNext = () => {
        if (framesExtracted >= NUM_FRAMES || currentTime >= duration) {
          URL.revokeObjectURL(videoUrl); // Clean up
          resolve(frames);
          return;
        }
        video.currentTime = currentTime;
      };

      video.onseeked = async () => {
        try {
            // A small delay might be needed for the frame to be fully rendered
            await new Promise(r => setTimeout(r, 200)); 
            
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            frames.push(dataUrl);

            framesExtracted++;
            currentTime += interval;
            seekNext();
        } catch (e) {
            URL.revokeObjectURL(videoUrl);
            reject(new Error(`Failed to draw video frame on canvas: ${e}`));
        }
      };
      
      video.onerror = (e) => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Error loading video file. It may be corrupt or in an unsupported format.'));
      };
      
      // Start the process
      video.play().then(seekNext).catch(e => {
          // If autoplay fails, we can try seeking directly.
          seekNext();
      });
    };
    
    video.load();
  });
};
