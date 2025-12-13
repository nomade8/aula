import React, { useState, useRef, useEffect } from 'react';
import Blackboard from './components/Blackboard';
import Toolbar from './components/Toolbar';
import { ToolType } from './types';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.PENCIL);
  const [activeColor, setActiveColor] = useState<string>('#ffffff');
  const [activeWidth, setActiveWidth] = useState<number>(3);
  const [clearTrigger, setClearTrigger] = useState(0);
  
  // State for passing uploaded files to Blackboard
  const [uploadedFile, setUploadedFile] = useState<{ type: 'image' | 'video', url: string, id: number } | null>(null);

  // --- Video Controls State ---
  const [selectedVideo, setSelectedVideo] = useState<HTMLVideoElement | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoVolume, setVideoVolume] = useState(0); // Default to muted

  // Hidden file inputs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Sync state with selected video events
  useEffect(() => {
    if (!selectedVideo) {
      setIsVideoPlaying(false);
      setVideoVolume(0);
      return;
    }

    // Initial state
    setIsVideoPlaying(!selectedVideo.paused);
    setVideoVolume(selectedVideo.volume);

    // Event listeners to update UI when video changes state (e.g. finishes, loops)
    const onPlay = () => setIsVideoPlaying(true);
    const onPause = () => setIsVideoPlaying(false);
    const onVolumeChange = () => setVideoVolume(selectedVideo.volume);

    selectedVideo.addEventListener('play', onPlay);
    selectedVideo.addEventListener('pause', onPause);
    selectedVideo.addEventListener('volumechange', onVolumeChange);

    return () => {
      selectedVideo.removeEventListener('play', onPlay);
      selectedVideo.removeEventListener('pause', onPause);
      selectedVideo.removeEventListener('volumechange', onVolumeChange);
    };
  }, [selectedVideo]);

  const handleClear = () => {
    // Immediate clear without confirmation as requested
    setClearTrigger(prev => prev + 1);
  };

  const handleUploadClick = (type: 'image' | 'video') => {
    if (type === 'image' && imageInputRef.current) {
      imageInputRef.current.click();
    } else if (type === 'video' && videoInputRef.current) {
      videoInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedFile({
        type,
        url,
        id: Date.now() // Unique ID to trigger useEffect even if URL is same (though rare)
      });
      // Reset input so same file can be selected again
      e.target.value = '';
      
      // Auto-switch to Select tool to manipulate the new object
      setActiveTool(ToolType.SELECT);
    }
  };

  // Video Actions
  const toggleVideoPlay = () => {
    if (selectedVideo) {
      if (selectedVideo.paused) {
        selectedVideo.play();
      } else {
        selectedVideo.pause();
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (selectedVideo) {
      selectedVideo.volume = newVolume;
      selectedVideo.muted = newVolume === 0;
    }
  };

  return (
    <div className="w-screen h-screen bg-neutral-950 flex flex-col overflow-hidden text-white font-sans selection:bg-white selection:text-black">
      
      {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={imageInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => handleFileChange(e, 'image')}
      />
      <input 
        type="file" 
        ref={videoInputRef} 
        accept="video/*" 
        className="hidden" 
        onChange={(e) => handleFileChange(e, 'video')}
      />

      {/* Header / Info */}
      <div className="absolute top-4 left-6 z-10 opacity-50 pointer-events-none select-none">
        <h1 className="text-xl font-bold tracking-widest uppercase text-neutral-500">Aula</h1>
        <p className="text-xs text-neutral-600">Minimalist Blackboard</p>
      </div>

      {/* Main Board Area */}
      <div className="flex-grow relative z-0">
        <Blackboard 
          activeTool={activeTool} 
          activeColor={activeColor}
          activeWidth={activeWidth}
          clearTrigger={clearTrigger} 
          uploadedFile={uploadedFile}
          onVideoSelected={setSelectedVideo}
        />
      </div>

      {/* Floating Toolbar */}
      <Toolbar 
        activeTool={activeTool} 
        activeColor={activeColor}
        activeWidth={activeWidth}
        onSelectTool={setActiveTool} 
        onChangeColor={setActiveColor}
        onChangeWidth={setActiveWidth}
        onClear={handleClear} 
        onUploadImage={() => handleUploadClick('image')}
        onUploadVideo={() => handleUploadClick('video')}
        
        // Video Props
        selectedVideo={selectedVideo}
        isVideoPlaying={isVideoPlaying}
        videoVolume={videoVolume}
        onTogglePlay={toggleVideoPlay}
        onVolumeChange={handleVolumeChange}
      />

      {/* Help Hint */}
      <div className="absolute bottom-4 right-6 z-10 pointer-events-none select-none text-right">
        <p className="text-xs text-neutral-600">
          {activeTool === ToolType.SHAPE && "Draw rough shapes to auto-convert"}
          {activeTool === ToolType.TEXT && "Click anywhere to type"}
          {activeTool === ToolType.PENCIL && "Freehand drawing"}
          {activeTool === ToolType.SELECT && "Move, resize, or delete (Del key)"}
        </p>
      </div>

    </div>
  );
};

export default App;