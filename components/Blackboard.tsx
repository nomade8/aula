import React, { useEffect, useRef, useState } from 'react';
import { ToolType } from '../types';
import { analyzeShape } from '../utils/geometry';

interface BlackboardProps {
  activeTool: ToolType;
  activeColor: string;
  activeWidth: number;
  clearTrigger: number;
  uploadedFile: { type: 'image' | 'video', url: string, id: number } | null;
  onVideoSelected: (video: HTMLVideoElement | null) => void;
}

const Blackboard: React.FC<BlackboardProps> = ({ 
  activeTool, 
  activeColor, 
  activeWidth, 
  clearTrigger,
  uploadedFile,
  onVideoSelected
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null); 
  const isMountedRef = useRef(true);
  const [canvasReady, setCanvasReady] = useState(false);
  
  // Track video elements to pause them on unmount
  const videoElementsRef = useRef<HTMLVideoElement[]>([]);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!canvasRef.current || !containerRef.current || !window.fabric) return;

    // Dispose existing if any (safety check for Strict Mode)
    if (fabricRef.current) {
      fabricRef.current.dispose();
    }

    const fabric = window.fabric;
    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: '#000000',
      selection: false,
      fireRightClick: true,
      stopContextMenu: true,
      preserveObjectStacking: true, // Better performance for object manipulation
    });

    // Minimalist object styles
    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#ffffff',
      cornerStrokeColor: '#000000',
      borderColor: '#ffffff',
      cornerSize: 10,
      padding: 5,
      cornerStyle: 'circle',
      borderDashArray: [4, 4],
    });

    fabricRef.current = canvas;

    // Initial Resize
    const handleResize = () => {
      if (containerRef.current && fabricRef.current) {
        fabricRef.current.setWidth(containerRef.current.clientWidth);
        fabricRef.current.setHeight(containerRef.current.clientHeight);
        fabricRef.current.renderAll();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    setCanvasReady(true);

    // --- RENDER LOOP (Optimized) ---
    const animate = () => {
      if (!isMountedRef.current) return;
      
      const cvs = fabricRef.current;
      if (cvs) {
        // Only render loop if we have videos
        const objects = cvs.getObjects();
        const hasVideo = objects.some((o: any) => o.getElement && o.getElement()?.tagName === 'VIDEO');
        
        if (hasVideo) {
          cvs.renderAll();
        }
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    // Cleanup
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('resize', handleResize);
      
      videoElementsRef.current.forEach(v => v.pause());
      
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, []);

  // --- 2. HANDLE UPLOADS ---
  useEffect(() => {
    if (!uploadedFile || !fabricRef.current || !canvasReady) return;
    const canvas = fabricRef.current;
    const fabric = window.fabric;

    const vpt = canvas.viewportTransform;
    const centerX = (canvas.getWidth() / 2 - vpt[4]) / vpt[0];
    const centerY = (canvas.getHeight() / 2 - vpt[5]) / vpt[3];

    if (uploadedFile.type === 'image') {
      fabric.Image.fromURL(uploadedFile.url, (img: any) => {
        if (!img) return;
        const maxSize = 500;
        if (img.width > maxSize || img.height > maxSize) {
          const scale = maxSize / Math.max(img.width, img.height);
          img.scale(scale);
        }
        img.set({ left: centerX, top: centerY, originX: 'center', originY: 'center' });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    } 
    else if (uploadedFile.type === 'video') {
      const videoEl = document.createElement('video');
      videoEl.crossOrigin = 'anonymous';
      videoEl.loop = true;
      videoEl.muted = true; 
      videoEl.playsInline = true;
      videoEl.src = uploadedFile.url;
      
      videoElementsRef.current.push(videoEl);

      const onVideoLoad = () => {
         videoEl.removeEventListener('loadeddata', onVideoLoad);
         videoEl.width = videoEl.videoWidth;
         videoEl.height = videoEl.videoHeight;

         const maxSize = 600;
         let scale = 1;
         if (videoEl.videoWidth > maxSize || videoEl.videoHeight > maxSize) {
           scale = maxSize / Math.max(videoEl.videoWidth, videoEl.videoHeight);
         }

         const videoObj = new fabric.Image(videoEl, {
            left: centerX,
            top: centerY,
            originX: 'center',
            originY: 'center',
            objectCaching: false, 
         });
         videoObj.scale(scale);
         canvas.add(videoObj);
         canvas.setActiveObject(videoObj);
         videoEl.play();
         canvas.renderAll();
      };
      if (videoEl.readyState >= 2) onVideoLoad();
      else videoEl.addEventListener('loadeddata', onVideoLoad);
    }
  }, [uploadedFile, canvasReady]);

  // --- 3. HANDLE CLEAR ---
  useEffect(() => {
    if (clearTrigger > 0 && fabricRef.current) {
      const canvas = fabricRef.current;
      videoElementsRef.current.forEach(v => v.pause());
      videoElementsRef.current = [];
      
      canvas.clear();
      canvas.backgroundColor = '#000000';
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // Reset zoom
      
      // Re-apply background selection for drawing tools if needed
      if (activeTool === ToolType.PENCIL || activeTool === ToolType.SHAPE) {
         canvas.isDrawingMode = true;
      }
      
      canvas.renderAll();
      onVideoSelected(null);
    }
  }, [clearTrigger]);

  // --- 4. HANDLE PROPS UPDATES (Color, Width, Tool visuals) ---
  useEffect(() => {
    if (!fabricRef.current || !canvasReady) return;
    const canvas = fabricRef.current;
    const fabric = window.fabric;
    
    // Update Brush
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = activeTool === ToolType.SHAPE ? activeColor : activeColor;
      canvas.freeDrawingBrush.width = activeWidth;
      
      // Re-apply shadow for Pencil
      if (activeTool === ToolType.PENCIL) {
        canvas.freeDrawingBrush.shadow = new fabric.Shadow({
          blur: 2,
          color: activeColor,
          offsetX: 0,
          offsetY: 0
        });
      } else {
        canvas.freeDrawingBrush.shadow = null;
      }
    }

    // Update Selected Object Styles
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      if (activeObject.type === 'i-text' || activeObject.type === 'text') {
        activeObject.set('fill', activeColor);
      } else if (activeObject.type !== 'image') { 
        activeObject.set('stroke', activeColor);
        activeObject.set('strokeWidth', activeWidth);
        if (activeObject.type === 'line') activeObject.set('stroke', activeColor);
      }
      canvas.requestRenderAll();
    }
  }, [activeColor, activeWidth, activeTool, canvasReady]);

  // --- 5. MAIN EVENT & TOOL LOGIC ---
  useEffect(() => {
    if (!fabricRef.current || !canvasReady) return;
    const canvas = fabricRef.current;
    const fabric = window.fabric;

    // Detach all old listeners to prevent duplication
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');
    canvas.off('mouse:wheel');
    canvas.off('path:created');
    canvas.off('selection:created');
    canvas.off('selection:updated');
    canvas.off('selection:cleared');

    // -- SELECTION HANDLERS --
    const handleSelection = (e: any) => {
      const activeObj = e.selected?.[0];
      if (activeObj && activeObj.getElement && activeObj.getElement()?.tagName === 'VIDEO') {
        onVideoSelected(activeObj.getElement());
      } else {
        onVideoSelected(null);
      }
    };
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => onVideoSelected(null));


    // -- ZOOM HANDLER --
    canvas.on('mouse:wheel', function(opt: any) {
      // Prevent browser scroll, ensure event is cancelable
      if (opt.e.preventDefault && opt.e.cancelable) {
        opt.e.preventDefault();
      }
      opt.e.stopPropagation();

      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      
      // Smooth zoom factor calculation
      zoom *= 0.999 ** delta;
      
      // Hard limits
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    });

    // -- PANNING STATE --
    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    // -- MOUSE DOWN --
    canvas.on('mouse:down', (opt: any) => {
      const evt = opt.e;
      
      // Middle Click (1) or Alt+Click -> START PANNING
      if (evt.button === 1 || evt.altKey) {
        isPanning = true;
        canvas.selection = false;
        canvas.isDrawingMode = false; 
        lastX = evt.clientX;
        lastY = evt.clientY;
        canvas.defaultCursor = 'grabbing';
        canvas.setCursor('grabbing');
        return; 
      }

      // Tool Logic
      if (activeTool === ToolType.TEXT) {
        if (opt.target) return; // Don't create text if clicking an object
        const pointer = canvas.getPointer(evt);
        const text = new fabric.IText('Type here...', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'sans-serif',
          fill: activeColor,
          fontSize: Math.max(20, activeWidth * 5),
          editable: true,
          selectable: true 
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
      }
    });

    // -- MOUSE MOVE --
    canvas.on('mouse:move', (opt: any) => {
      if (isPanning) {
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        vpt[4] += e.clientX - lastX;
        vpt[5] += e.clientY - lastY;
        canvas.requestRenderAll();
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });

    // -- MOUSE UP --
    canvas.on('mouse:up', () => {
      if (isPanning) {
        canvas.setViewportTransform(canvas.viewportTransform); // Commit pan
        isPanning = false;
        
        // Restore Tool State
        if (activeTool === ToolType.PENCIL || activeTool === ToolType.SHAPE) {
           canvas.isDrawingMode = true;
           canvas.defaultCursor = 'crosshair';
        } else if (activeTool === ToolType.SELECT) {
           canvas.selection = true;
           canvas.defaultCursor = 'default';
        } else {
           canvas.isDrawingMode = false;
           canvas.defaultCursor = 'default';
        }
      }
    });

    // -- APPLY TOOL SETTINGS --
    if (activeTool === ToolType.SELECT) {
      canvas.selection = true; 
      canvas.skipTargetFind = false; 
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
      canvas.isDrawingMode = false;
    }
    else if (activeTool === ToolType.PENCIL) {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = activeWidth;
      canvas.freeDrawingBrush.color = activeColor;
      canvas.defaultCursor = 'crosshair';
      canvas.selection = false;
    } 
    else if (activeTool === ToolType.TEXT) {
      canvas.defaultCursor = 'text';
      canvas.isDrawingMode = false;
      canvas.selection = false;
    }
    else if (activeTool === ToolType.SHAPE) {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = activeWidth;
      canvas.freeDrawingBrush.color = activeColor; 
      canvas.defaultCursor = 'crosshair';
      canvas.selection = false;
      
      canvas.on('path:created', (e: any) => {
        const path = e.path;
        
        const points: {x: number, y: number}[] = [];
        if (path.path) {
          path.path.forEach((cmd: any[]) => {
             if (cmd.length >= 3) {
                points.push({ x: cmd[cmd.length - 2], y: cmd[cmd.length - 1] });
             }
          });
        }

        const shape = analyzeShape(points);

        if (shape.type !== 'unknown') {
          canvas.remove(path);
          let newObject;
          const commonProps = {
            stroke: activeColor,
            strokeWidth: activeWidth,
            fill: 'transparent',
            originX: 'center',
            originY: 'center',
            selectable: true 
          };

          if (shape.type === 'circle') {
            newObject = new fabric.Circle({
              ...commonProps,
              left: shape.data.centerX,
              top: shape.data.centerY,
              radius: shape.data.radius,
            });
          } else if (shape.type === 'rect') {
            newObject = new fabric.Rect({
              ...commonProps,
              left: shape.data.left + shape.data.width/2,
              top: shape.data.top + shape.data.height/2,
              width: shape.data.width,
              height: shape.data.height,
            });
          } else if (shape.type === 'triangle') {
             newObject = new fabric.Triangle({
              ...commonProps,
              left: shape.data.centerX,
              top: shape.data.centerY,
              width: shape.data.width,
              height: shape.data.height,
            });
          } else if (shape.type === 'line') {
             newObject = new fabric.Line([shape.data.start.x, shape.data.start.y, shape.data.end.x, shape.data.end.y], {
                ...commonProps,
                originX: 'left',
                originY: 'top',
             });
          }

          if (newObject) {
            canvas.add(newObject);
            canvas.renderAll();
          }
        }
      });
    }

  }, [activeTool, canvasReady]); // Only re-run if tool changes or canvas is reset

  // --- 6. KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricRef.current) return;
      const canvas = fabricRef.current;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length) {
          const activeObject = canvas.getActiveObject();
          if (activeObject && activeObject.isEditing) return;
          canvas.discardActiveObject(); 
          activeObjects.forEach((obj: any) => {
            if (obj.getElement && obj.getElement()?.tagName === 'VIDEO') {
                try { obj.getElement().pause(); } catch(e) {}
            }
            canvas.remove(obj);
          });
          canvas.renderAll();
          onVideoSelected(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasReady]);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-black overflow-hidden">
      <canvas ref={canvasRef} />
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{
             backgroundImage: `url('https://www.transparenttextures.com/patterns/black-chalk.png')`, 
             backgroundRepeat: 'repeat'
           }}>
      </div>
    </div>
  );
};

export default Blackboard;