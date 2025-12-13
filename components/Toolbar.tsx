import React from 'react';
import { ToolType } from '../types';
import { Pencil, Type, Shapes, Trash2, MousePointer2, Image as ImageIcon, Video as VideoIcon, Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface ToolbarProps {
  activeTool: ToolType;
  activeColor: string;
  activeWidth: number;
  onSelectTool: (tool: ToolType) => void;
  onChangeColor: (color: string) => void;
  onChangeWidth: (width: number) => void;
  onClear: () => void;
  onUploadImage: () => void;
  onUploadVideo: () => void;

  // Optional video controls
  selectedVideo?: HTMLVideoElement | null;
  isVideoPlaying?: boolean;
  videoVolume?: number;
  onTogglePlay?: () => void;
  onVolumeChange?: (val: number) => void;
}

const COLORS = [
  { hex: '#ffffff', label: 'White' },
  { hex: '#ef4444', label: 'Red' }, // Red-500
  { hex: '#eab308', label: 'Yellow' }, // Yellow-500
  { hex: '#22c55e', label: 'Green' }, // Green-500
  { hex: '#3b82f6', label: 'Blue' }, // Blue-500
];

const Toolbar: React.FC<ToolbarProps> = ({ 
  activeTool, 
  activeColor,
  activeWidth,
  onSelectTool, 
  onChangeColor,
  onChangeWidth,
  onClear,
  onUploadImage,
  onUploadVideo,
  selectedVideo,
  isVideoPlaying,
  videoVolume,
  onTogglePlay,
  onVolumeChange
}) => {
  const getButtonClass = (tool: ToolType) => {
    const base = "p-3 rounded-full transition-all duration-200 flex items-center justify-center";
    return activeTool === tool
      ? `${base} bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)] transform scale-110`
      : `${base} text-neutral-400 hover:text-white hover:bg-neutral-800`;
  };

  // Determine what to show in the properties bar
  const showProperties = activeTool === ToolType.PENCIL || activeTool === ToolType.SHAPE || activeTool === ToolType.TEXT || activeTool === ToolType.SELECT;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-50">
      
      {/* Properties Bar: Either Drawing Config OR Video Controls */}
      {showProperties && (
        <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-2xl px-4 py-3 flex items-center gap-6 shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-300">
          
          {selectedVideo ? (
            // --- VIDEO CONTROLS ---
            <div className="flex items-center gap-4">
              <button 
                onClick={onTogglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-black hover:scale-110 transition-transform"
              >
                {isVideoPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-0.5"/>}
              </button>

              <div className="w-px h-6 bg-neutral-700"></div>

              <div className="flex items-center gap-3">
                 <button onClick={() => onVolumeChange && onVolumeChange(videoVolume === 0 ? 1 : 0)}>
                   {videoVolume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                 </button>
                 <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={videoVolume || 0}
                  onChange={(e) => onVolumeChange && onVolumeChange(parseFloat(e.target.value))}
                  className="w-24 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                 />
              </div>
            </div>
          ) : (
            // --- DRAWING CONTROLS ---
            <>
              {/* Colors */}
              <div className="flex gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => onChangeColor(c.hex)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${activeColor === c.hex ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>

              <div className="w-px h-6 bg-neutral-700"></div>

              {/* Stroke Slider */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neutral-500"></div>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={activeWidth} 
                  onChange={(e) => onChangeWidth(Number(e.target.value))}
                  className="w-24 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                  title={`Stroke width: ${activeWidth}px`}
                />
                <div className="w-4 h-4 rounded-full bg-neutral-500"></div>
              </div>
            </>
          )}

        </div>
      )}

      {/* Main Toolbar */}
      <div className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-2xl px-2 py-2 flex items-center gap-2 shadow-2xl">
        
        <button 
          onClick={() => onSelectTool(ToolType.SELECT)} 
          className={getButtonClass(ToolType.SELECT)}
          title="Select & Move"
        >
          <MousePointer2 size={24} />
        </button>

        <button 
          onClick={() => onSelectTool(ToolType.PENCIL)} 
          className={getButtonClass(ToolType.PENCIL)}
          title="Freehand Draw"
        >
          <Pencil size={24} />
        </button>

        <button 
          onClick={() => onSelectTool(ToolType.TEXT)} 
          className={getButtonClass(ToolType.TEXT)}
          title="Add Text"
        >
          <Type size={24} />
        </button>

        <button 
          onClick={() => onSelectTool(ToolType.SHAPE)} 
          className={getButtonClass(ToolType.SHAPE)}
          title="Smart Shape"
        >
          <Shapes size={24} />
        </button>

        <div className="w-px h-8 bg-neutral-700 mx-1"></div>

        {/* Media Tools */}
        <button 
          onClick={onUploadImage} 
          className="p-3 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
          title="Upload Image"
        >
          <ImageIcon size={24} />
        </button>

        <button 
          onClick={onUploadVideo} 
          className="p-3 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all"
          title="Upload Video"
        >
          <VideoIcon size={24} />
        </button>

        <div className="w-px h-8 bg-neutral-700 mx-1"></div>

        <button 
          onClick={onClear}
          className="p-3 text-red-500 hover:bg-red-900/30 rounded-full transition-colors"
          title="Clear Board"
        >
          <Trash2 size={24} />
        </button>

      </div>
    </div>
  );
};

export default Toolbar;