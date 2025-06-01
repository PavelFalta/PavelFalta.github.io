import React, { useState } from 'react';
import { motion } from 'framer-motion';

// Define a type for Project props
interface Project {
  title: string;
  description: string;
  url: string;
  styles?: {
    gradient?: string;
    shadow?: string;
    hoverShadow?: string;
    textColor?: string;
    hoverTextColor?: string;
    hoverEffect?: 'neon' | 'pulse' | 'traffic' | 'signalPulse' | 'heartbeat';
  };
}

// Example project data (replace or add more as needed)
const projects: Project[] = [
  {
    title: 'HDF5/ARTF Visualizer',
    description: 'An interactive in-browser tool to visualize HDF5 signal data with ARTF annotations, featuring zoom, pan, and segment details on hover.',
    url: '/hdf5visualizer/',
    styles: {
      gradient: 'from-teal-500 to-blue-600',
      shadow: 'rgba(20, 184, 166, 0.4)',
      hoverShadow: 'rgba(20, 184, 166, 0.6)',
      textColor: 'text-teal-300',
      hoverTextColor: 'text-teal-200',
      hoverEffect: 'signalPulse'
    }
  },
  {
    title: 'Traffic Light',
    description: 'A simple traffic light app built with React and TypeScript. Designed to help convey real-time feedback from students in a classroom.',
    url: '/traffic-light/',
    styles: {
      gradient: 'from-green-500 to-emerald-600',
      shadow: 'rgba(34, 197, 94, 0.5)',
      hoverShadow: 'rgba(34, 197, 94, 0.7)',
      textColor: 'text-green-400',
      hoverTextColor: 'text-green-300',
      hoverEffect: 'traffic'
    }
  },
  {
    title: 'ThoughtSpace',
    description: 'An aesthetically pleasing todo app built with React and TypeScript. Make constellations of thoughts and ideas.',
    url: '/todo-app/',
    styles: {
      gradient: 'from-blue-500 to-purple-600',
      shadow: 'rgba(59, 130, 246, 0.5)',
      hoverShadow: 'rgba(59, 130, 246, 0.7)',
      textColor: 'text-blue-400',
      hoverTextColor: 'text-purple-300',
      hoverEffect: 'neon'
    }
  },
  {
    title: 'PhysioSim',
    description: 'Biosignal simulator for generating realistic physiological data including ECG, ABP, and ICP patterns with customizable parameters.',
    url: '/physiosim/',
    styles: {
      gradient: 'from-orange-500 to-red-600',
      shadow: 'rgba(249, 115, 22, 0.4)',
      hoverShadow: 'rgba(239, 68, 68, 0.6)',
      textColor: 'text-orange-400',
      hoverTextColor: 'text-red-300',
      hoverEffect: 'heartbeat'
    }
  },
  // Add other projects here
  // {
  //   title: 'Project 2',
  //   description: 'Description for project 2.',
  //   url: '#',
  // },
];

// Project Card Component
function ProjectCard({ project }: { project: Project }): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  
  // Default styles if none provided
  const defaultStyles = {
    gradient: 'from-blue-500 to-blue-600',
    shadow: 'rgba(59, 130, 246, 0.5)',
    hoverShadow: 'rgba(59, 130, 246, 0.7)',
    textColor: 'text-blue-400',
    hoverTextColor: 'text-blue-300',
    hoverEffect: 'neon' as const
  };

  // Merge with defaults
  const styles = { ...defaultStyles, ...project.styles };
  
  // Specialized hover effects based on project type
  const getHoverAnimationProps = () => {
    switch(styles.hoverEffect) {
      case 'neon':
        return {
          whileHover: { 
            scale: 1.05, 
            boxShadow: `0 0 25px ${styles.hoverShadow}, 0 0 15px ${styles.shadow}`,
            y: -5
          },
          transition: { 
            type: "spring", 
            stiffness: 400, 
            damping: 15 
          }
        };
      case 'traffic':
        return {
          whileHover: { 
            scale: 1.05,
            boxShadow: [
              `0 0 20px rgba(220, 38, 38, 0.7)`, // Red
              `0 0 20px rgba(234, 179, 8, 0.7)`,  // Yellow
              `0 0 20px rgba(34, 197, 94, 0.7)`,  // Green
              `0 0 20px rgba(34, 197, 94, 0.7)`,
            ],
            y: -5
          },
          transition: { 
            boxShadow: {
              duration: 2,
              repeat: Infinity,
              repeatType: "loop" as const
            },
            duration: 0.3
          }
        };
      case 'signalPulse':
        return {
          whileHover: { 
            scale: 1.05, 
            boxShadow: `0 0 25px ${styles.hoverShadow}, 0 0 15px ${styles.shadow}`,
            y: -5
          },
          transition: { 
            type: "spring", 
            stiffness: 400, 
            damping: 15
          }
        };
      case 'heartbeat':
        return {
          whileHover: { 
            scale: [1.05, 1.08, 1.05, 1.06, 1.05],
            boxShadow: [
              `0 0 15px ${styles.shadow}`,
              `0 0 30px ${styles.hoverShadow}, 0 0 20px ${styles.shadow}`,
              `0 0 15px ${styles.shadow}`,
              `0 0 25px ${styles.hoverShadow}, 0 0 15px ${styles.shadow}`,
              `0 0 15px ${styles.shadow}`
            ],
            y: -5
          },
          transition: { 
            duration: 1.2,
            repeat: Infinity,
            repeatType: "loop" as const,
            ease: "easeInOut"
          }
        };
      default:
        return {
          whileHover: { 
            scale: 1.05,
            boxShadow: `0 0 20px ${styles.hoverShadow}`,
            y: -5
          }
        };
    }
  };

  return (
    <motion.a
      href={project.url}
      className={`block p-6 rounded-lg transform transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-blue-500 overflow-hidden relative
        bg-gradient-to-r ${styles.gradient}`}
      initial={{ 
        boxShadow: `0 0 10px ${styles.shadow}`,
      }}
      {...getHoverAnimationProps()}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Conditional glow overlay for ThoughtSpace card */}
      {styles.hoverEffect === 'neon' && (
        <motion.div 
          className="absolute inset-0 opacity-0 bg-gradient-to-r from-blue-500/30 to-purple-600/30"
          animate={{ opacity: isHovered ? 0.6 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
      
      {/* For traffic light, add animated dots */}
      {styles.hoverEffect === 'traffic' && (
        <div className="absolute right-4 top-4 flex flex-col space-y-2">
          <motion.div 
            className="w-3 h-3 rounded-full bg-red-500"
            animate={{ 
              boxShadow: isHovered ? ['0 0 0px rgba(220, 38, 38, 0)', '0 0 10px rgba(220, 38, 38, 0.7)', '0 0 0px rgba(220, 38, 38, 0)'] : '0 0 0px rgba(220, 38, 38, 0)'
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.div 
            className="w-3 h-3 rounded-full bg-yellow-500"
            animate={{ 
              boxShadow: isHovered ? ['0 0 0px rgba(234, 179, 8, 0)', '0 0 10px rgba(234, 179, 8, 0.7)', '0 0 0px rgba(234, 179, 8, 0)'] : '0 0 0px rgba(234, 179, 8, 0)'
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div 
            className="w-3 h-3 rounded-full bg-green-500"
            animate={{ 
              boxShadow: isHovered ? ['0 0 0px rgba(34, 197, 94, 0)', '0 0 10px rgba(34, 197, 94, 0.7)', '0 0 0px rgba(34, 197, 94, 0)'] : '0 0 0px rgba(34, 197, 94, 0)'
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
          />
        </div>
      )}
      
      {/* New: Animated pulse for signalPulse effect */}
      {styles.hoverEffect === 'signalPulse' && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 h-1 bg-green-400 rounded-full"
              animate={{
                scale: isHovered ? [1, 2.5, 1] : 1,
                opacity: isHovered ? [0.5, 1, 0.5] : 0.3,
              }}
              transition={{
                duration: 0.7,
                repeat: Infinity,
                delay: i * 0.2, // Stagger the animation for a wave effect
                ease: "easeInOut"
              }}
            />
          ))}
          <motion.div 
            className="w-1.5 h-1.5 rounded-full bg-green-300"
            animate={{ 
              boxShadow: isHovered 
                ? ['0 0 0px rgba(52, 211, 153, 0)', '0 0 10px rgba(52, 211, 153, 0.9)', '0 0 0px rgba(52, 211, 153, 0)'] 
                : '0 0 0px rgba(52, 211, 153, 0)',
              scale: isHovered ? [1, 1.5, 1] : 1,
            }}
            transition={{
              duration: 1.0, // Slower, more distinct pulse for the main blip
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.1 // Slight delay to sync with smaller dots
            }}
          />
        </div>
      )}
      
      {/* Heartbeat effect for PhysioSim */}
      {styles.hoverEffect === 'heartbeat' && (
        <div className="absolute right-4 top-4 flex items-center space-x-2">
          {/* EKG-like waveform */}
          <div className="flex items-end space-x-0.5">
            {[1, 3, 6, 2, 1, 4, 8, 3, 1].map((height, i) => (
              <motion.div
                key={i}
                className="bg-red-400 rounded-full"
                style={{ width: '2px', height: `${height * 2}px` }}
                animate={{
                  height: isHovered ? [`${height * 2}px`, `${height * 3}px`, `${height * 2}px`] : `${height * 2}px`,
                  backgroundColor: isHovered ? ['#f87171', '#ef4444', '#f87171'] : '#f87171',
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
          {/* Heartbeat icon */}
          <motion.div
            className="w-4 h-4 text-red-400"
            animate={{
              scale: isHovered ? [1, 1.3, 1, 1.2, 1] : 1,
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </motion.div>
        </div>
      )}
      
      <div className="relative z-10"> {/* Content wrapper to stay above effects */}
        <h2 className="text-xl font-semibold text-white mb-2">{project.title}</h2>
        <p className="text-gray-200 mb-4">{project.description}</p>
        <motion.span 
          className={`inline-flex items-center ${styles.textColor} transition duration-300 font-medium`}
          animate={{ x: isHovered ? 5 : 0 }}
        >
          View Project 
          <motion.svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 ml-1" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            animate={{ x: isHovered ? 3 : 0 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </motion.svg>
        </motion.span>
      </div>
    </motion.a>
  );
}

// Main App Component
function App(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300 flex flex-col items-center p-6 md:p-12">
      <header className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Fun lil' projects :)</h1>
        <p className="text-lg md:text-xl text-gray-400">A showcase of what I've been cooking up.</p>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project, index) => (
          <ProjectCard key={index} project={project} />
        ))}
        {/* Add more ProjectCard components or dynamically generate them */}
      </main>

      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Pavel Falta. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
