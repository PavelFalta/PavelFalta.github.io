import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  pulseIntensity: number;
  pulseSpeed: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Connection {
  id: string;
  sourceId: number;
  targetId: number;
  color: string;
  opacity: number;
  pulseSpeed: number;
  pulsePhase: number;
}

const MAX_STARS = 50;
const MAX_CONNECTION_LENGTH = 150;
const COLORS = [
  '#3b82f6', // blue-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#06b6d4', // cyan-500
  '#a855f7', // fuchsia-500
  '#6366f1', // indigo-500
];

const ConstellationBackground: React.FC = () => {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Generate stars with more varied properties
  const generateStars = (): Star[] => {
    const stars: Star[] = [];
    for (let i = 0; i < MAX_STARS; i++) {
      stars.push({
        id: i,
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        size: Math.random() * 2 + 1.5, // 1.5-3.5px (slightly larger)
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: Math.random() * 0.5 + 0.4, // 0.4-0.9 (more visible)
        pulseIntensity: Math.random() * 0.2 + 0.1,
        pulseSpeed: Math.random() * 4 + 6,
        twinkleSpeed: Math.random() * 4 + 6,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    return stars;
  };

  // Generate connections between nearby stars
  const generateConnections = (stars: Star[]): Connection[] => {
    const connections: Connection[] = [];
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= MAX_CONNECTION_LENGTH) {
          connections.push({
            id: `${i}-${j}`,
            sourceId: stars[i].id,
            targetId: stars[j].id,
            color: stars[i].color,
            opacity: Math.random() * 0.3 + 0.15, // 0.15-0.45 (more visible)
            pulseSpeed: Math.random() * 4 + 6,
            pulsePhase: Math.random() * Math.PI * 2,
          });
        }
      }
    }
    return connections;
  };

  const [stars, setStars] = useState<Star[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    const newStars = generateStars();
    setStars(newStars);
    setConnections(generateConnections(newStars));

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dimensions.width, dimensions.height]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Background gradient */}
      <div 
        className="absolute inset-0" 
        style={{ 
          background: 'radial-gradient(circle at center, rgba(17, 24, 39, 0.2) 0%, rgba(17, 24, 39, 0.7) 100%)', // Lighter background
          zIndex: -1
        }}
      />

      {/* Connections */}
      {connections.map((connection) => {
        const source = stars.find((s) => s.id === connection.sourceId);
        const target = stars.find((s) => s.id === connection.targetId);
        
        if (!source || !target) return null;
        
        const length = Math.sqrt(
          Math.pow(target.x - source.x, 2) + Math.pow(target.y - source.y, 2)
        );
        const angle = Math.atan2(target.y - source.y, target.x - source.x) * (180 / Math.PI);
        
        return (
          <motion.div
            key={connection.id}
            style={{
              position: 'absolute',
              left: source.x,
              top: source.y,
              width: length,
              height: '1px',
              backgroundColor: connection.color,
              opacity: connection.opacity,
              transform: `rotate(${angle}deg)`,
              transformOrigin: '0 0',
              filter: 'blur(0.3px)',
            }}
            animate={{
              opacity: [
                connection.opacity * 0.8, // Less fade
                connection.opacity,
                connection.opacity * 0.8,
              ],
            }}
            transition={{
              duration: connection.pulseSpeed,
              repeat: Infinity,
              ease: "easeInOut",
              delay: connection.pulsePhase,
            }}
          />
        );
      })}

      {/* Stars */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: star.x,
            top: star.y,
            width: star.size,
            height: star.size,
            backgroundColor: star.color,
            boxShadow: `0 0 ${star.size * 2}px ${star.size * 0.8}px ${star.color}`, // Increased glow
            opacity: star.opacity,
          }}
          animate={{
            opacity: [
              star.opacity * 0.8, // Less fade
              star.opacity,
              star.opacity * 0.8,
            ],
            scale: [
              1,
              1 + star.pulseIntensity,
              1,
            ],
            x: [
              0,
              Math.random() * 4 - 2,
              0,
            ],
            y: [
              0,
              Math.random() * 4 - 2,
              0,
            ],
          }}
          transition={{
            duration: star.pulseSpeed,
            repeat: Infinity,
            ease: "easeInOut",
            delay: star.twinklePhase,
          }}
        />
      ))}

      {/* Overlay gradient */}
      <div 
        className="absolute inset-0" 
        style={{ 
          background: 'radial-gradient(circle at center, transparent 30%, rgba(17, 24, 39, 0.2) 100%)', // Lighter overlay
          backdropFilter: 'blur(0.5px)',
        }}
      />
    </div>
  );
};

export default ConstellationBackground; 