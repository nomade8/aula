import { ShapeAnalysis } from '../types';

interface Point {
  x: number;
  y: number;
}

// --- Helper Functions ---

const getDistance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

const getPathLength = (points: Point[]) => {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += getDistance(points[i - 1], points[i]);
  }
  return len;
};

// --- Ramer-Douglas-Peucker (RDP) Algorithm ---
// Simplifies a polyline by reducing the number of points within a certain tolerance (epsilon)

const perpendicularDistance = (point: Point, lineStart: Point, lineEnd: Point) => {
  let dx = lineEnd.x - lineStart.x;
  let dy = lineEnd.y - lineStart.y;
  
  // Normalize
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag > 0) {
    dx /= mag;
    dy /= mag;
  }
  
  const pvx = point.x - lineStart.x;
  const pvy = point.y - lineStart.y;
  
  // Get scalar projection of point vector onto line vector
  const pvdot = dx * pvx + dy * pvy;
  
  // Check if projection point falls within the line segment
  const dsx = pvx - pvdot * dx;
  const dsy = pvy - pvdot * dy;
  
  return Math.sqrt(dsx * dsx + dsy * dsy);
};

const ramerDouglasPeucker = (points: Point[], epsilon: number): Point[] => {
  if (points.length < 3) return points;

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    const recResults1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
    const recResults2 = ramerDouglasPeucker(points.slice(index, end + 1), epsilon);

    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [points[0], points[end]];
  }
};

// --- Main Analysis Function ---

export const analyzeShape = (originalPoints: Point[]): ShapeAnalysis => {
  if (originalPoints.length < 10) return { type: 'unknown', score: 0, data: null };

  const start = originalPoints[0];
  const end = originalPoints[originalPoints.length - 1];
  const totalLength = getPathLength(originalPoints);
  const displacement = getDistance(start, end);

  // 1. Line Detection (Prioritize simple straight lines first)
  const linearity = displacement / totalLength;
  if (linearity > 0.94) {
    return { type: 'line', score: linearity, data: { start, end } };
  }

  // Calculate Bounding Box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  originalPoints.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const diag = Math.sqrt(width*width + height*height);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  // Fill Ratio Analysis
  let area = 0;
  for (let i = 0; i < originalPoints.length; i++) {
    const j = (i + 1) % originalPoints.length;
    area += originalPoints[i].x * originalPoints[j].y;
    area -= originalPoints[j].x * originalPoints[i].y;
  }
  area = Math.abs(area) / 2;
  const fillRatio = area / (width * height);

  // --- IMMEDIATE RECTANGLE CHECK (Fill Ratio) ---
  // A perfect circle (pi*r^2) inside a bounding box (2r*2r) has a fill ratio of pi/4 ~= 0.785.
  // A perfect square has a fill ratio of 1.0.
  // If the drawing fills > 80% of the box, it CANNOT be a circle. It's likely a rectangle.
  if (fillRatio > 0.80) {
    return { 
      type: 'rect', 
      score: fillRatio, 
      data: { left: minX, top: minY, width, height } 
    };
  }

  // --- RDP Simplification ---
  // Epsilon tolerance: dynamic based on size
  const epsilon = Math.max(5, diag * 0.04); 
  const simplified = ramerDouglasPeucker(originalPoints, epsilon);
  
  // Check if closed loop
  const isClosed = getDistance(simplified[0], simplified[simplified.length-1]) < (diag * 0.15) || getDistance(start, end) < (diag * 0.15);
  
  let vertices = [...simplified];
  if (isClosed && vertices.length > 3) {
    // If start and end are close, merge them
    if (getDistance(vertices[0], vertices[vertices.length-1]) < epsilon * 2) {
       vertices.pop();
    }
  }

  const vCount = vertices.length;

  // 2. Vertex Count Detection
  
  // Triangle (3 corners)
  if (vCount === 3) {
     return {
       type: 'triangle',
       score: 0.9,
       data: { centerX, centerY, width, height }
     };
  }

  // Rectangle/Square (4 to 6 corners allowed to handle jitter)
  if (vCount >= 4 && vCount <= 6) {
    return { 
      type: 'rect', 
      score: 0.9, 
      data: { left: minX, top: minY, width, height } 
    };
  }

  // 3. Circle Detection (Fallback)
  // If we are here, it's not a clear polygon. Check if it's round.
  
  let totalRadius = 0;
  originalPoints.forEach(p => totalRadius += getDistance(p, { x: centerX, y: centerY }));
  const avgRadius = totalRadius / originalPoints.length;
  
  let radiusVariance = 0;
  originalPoints.forEach(p => {
    const r = getDistance(p, { x: centerX, y: centerY });
    radiusVariance += Math.pow(r - avgRadius, 2);
  });
  radiusVariance /= originalPoints.length;
  const normalizedVariance = radiusVariance / (avgRadius * avgRadius);

  // Strict variance check for circles
  if (normalizedVariance < 0.05 && fillRatio > 0.6) {
    return { 
      type: 'circle', 
      score: 1 - normalizedVariance, 
      data: { centerX, centerY, radius: avgRadius } 
    };
  }

  // 4. Final Fallback
  // If it's messy but roughly triangular
  if (fillRatio > 0.35 && fillRatio < 0.65) {
    return {
       type: 'triangle',
       score: 0.7,
       data: { centerX, centerY, width, height }
     };
  }

  return { type: 'unknown', score: 0, data: null };
};