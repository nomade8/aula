export enum ToolType {
  SELECT = 'SELECT',
  PENCIL = 'PENCIL',
  SHAPE = 'SHAPE',
  TEXT = 'TEXT',
}

export interface ShapeAnalysis {
  type: 'circle' | 'rect' | 'triangle' | 'line' | 'unknown';
  score: number;
  data: any; // Context specific data (radius, width, etc)
}

// Global declaration for Fabric.js loaded via CDN
declare global {
  interface Window {
    fabric: any;
  }
}