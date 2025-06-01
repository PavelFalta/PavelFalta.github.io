import React from 'react';
import ConstellationBackground from '../components/ConstellationBackground';
import { motion } from 'framer-motion';
import VersionChangelog from '../components/VersionChangelog';
const MaintenancePage: React.FC = () => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-gray-900 text-gray-50">
      <ConstellationBackground />
      <motion.div
        className="relative z-10 flex flex-col items-center text-center p-8 bg-gray-800 bg-opacity-75 backdrop-blur-md rounded-xl shadow-2xl border border-purple-500"
        initial={{ opacity: 0, y: -30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
<motion.svg
  className="w-24 h-24 text-purple-400 mb-6"
  fill="none"
  stroke="currentColor"
  viewBox="0 0 24 24"
  xmlns="http://www.w3.org/2000/svg"
  initial={{ rotate: 0, scale: 0.8 }}
  animate={{ rotate: 360, scale: 1 }}
  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
>
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={1.5}
    d="M15.232 5.232a6 6 0 01-7.964 7.964l-4.268 4.268a2 2 0 002.828 2.828l4.268-4.268a6 6 0 017.964-7.964z"
  />
</motion.svg>

        <motion.h1
          className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4"
          style={{
            textShadow: '0 0 8px rgba(139, 92, 246, 0.6), 0 0 16px rgba(59, 130, 246, 0.4)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Under Maintenance
        </motion.h1>
        <motion.p
          className="text-lg md:text-xl text-gray-300 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Our digital universe is currently undergoing some stellar upgrades.
        </motion.p>
        <motion.p
          className="text-md text-gray-400 max-w-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          We're working hard to bring you an even better experience. We expect to be back online shortly. Thank you for your patience!
        </motion.p>
        
        <motion.div 
          className="mt-8 w-full max-w-xs h-2 bg-purple-500 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-blue-400 to-pink-500"
            style={{ width: '100%' }}
            initial={{ x: "-100%" }}
            animate={{ x: "0%" }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              repeatType: "loop", 
              ease: "linear",
              times: [0, 0.5, 1], // Control animation points
              x: ["-100%", "100%", "-100%"]
            }}
          />
        </motion.div>
         <motion.p
          className="text-xs text-gray-500 mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          ERROR CODE: NOVA_BLACKOUT_42
        </motion.p>
      </motion.div>
      <VersionChangelog />
    </div>
  );
};

export default MaintenancePage; 