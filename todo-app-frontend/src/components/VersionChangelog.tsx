import { motion, AnimatePresence } from 'framer-motion';
import versions from '../data/versions.json';
import { useState } from 'react';

function VersionChangelog() {
  const [versionsHovered, setVersionsHovered] = useState(false);

  return (
    <>
      {/* Desktop version (md and up) */}
      <motion.div
        className="hidden [@media(min-width:1000px)]:block fixed bottom-6 right-6 z-50 rounded-2xl backdrop-blur-md overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.8) 0%, rgba(17, 24, 39, 0.95) 100%)',
          boxShadow: '0 0 15px rgba(59, 130, 246, 0.3), 0 0 30px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          transformOrigin: 'bottom right'
        }}
        initial={{ width: '120px' }}
        whileHover={{
          width: '280px',
          transition: { duration: 0.3, ease: "easeOut" }
        }}
      >
        <div
          className="relative h-full w-full"
          onMouseEnter={() => setVersionsHovered(true)}
          onMouseLeave={() => setVersionsHovered(false)}
        >
          <div className="flex items-center justify-center p-2 h-12">
            <motion.div
              className="text-base font-semibold text-white flex items-center"
              whileHover={{ scale: 1.05 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>Versions</span>
            </motion.div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60"></div>

          <AnimatePresence>
            {versionsHovered && (
              <motion.div
                className="w-full overflow-hidden flex flex-col"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="px-4 pt-3 pb-2 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent">
                  <div className="space-y-3">
                    {versions.map((v, index) => (
                      <motion.div
                        key={index}
                        className={`bg-gray-800 border ${index === 0 ? 'border-purple-500' : 'border-gray-700'} hover:${index === 0 ? 'border-purple-500' : 'border-blue-500'} transition-all px-3 py-2 rounded-lg cursor-default relative overflow-hidden group`}
                        whileHover={{
                          scale: 1.02,
                          boxShadow: index === 0
                            ? '0 0 18px rgba(139, 92, 246, 0.5)'
                            : '0 0 10px rgba(59, 130, 246, 0.3)'
                        }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          boxShadow: index === 0 ? '0 0 12px rgba(139, 92, 246, 0.4)' : 'none',
                          background: index === 0
                            ? 'linear-gradient(to right, rgba(17, 24, 39, 0.95), rgba(24, 24, 60, 0.98))'
                            : undefined
                        }}
                        animate={index === 0 ? {
                          boxShadow: [
                            '0 0 12px rgba(139, 92, 246, 0.3)',
                            '0 0 16px rgba(139, 92, 246, 0.5)',
                            '0 0 12px rgba(139, 92, 246, 0.3)'
                          ]
                        } : undefined}
                        transition={index === 0 ? {
                          boxShadow: {
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }
                        } : undefined}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-r ${index === 0 ? 'from-purple-500/15 to-blue-500/10' : 'from-blue-500/5 to-purple-500/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                        <div className="flex items-center">
                          <motion.div
                            className={`rounded-full mr-2 flex-shrink-0 ${index === 0 ? 'h-3 w-3' : 'h-2 w-2'}`}
                            style={{
                              backgroundColor: index === 0 ? '#8b5cf6' : '#6b7280',
                            }}
                            animate={{
                              boxShadow: index === 0
                                ? ['0 0 0px rgba(139, 92, 246, 0.4)', '0 0 12px rgba(139, 92, 246, 0.8)', '0 0 0px rgba(139, 92, 246, 0.4)']
                                : 'none',
                              scale: index === 0 ? [1, 1.15, 1] : 1
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                          <h3
                            className={`font-medium text-sm truncate ${index === 0 ? 'text-purple-200' : 'text-white'}`}
                            style={{
                              textShadow: index === 0 ? '0 0 8px rgba(139, 92, 246, 0.7)' : 'none'
                            }}
                          >
                            {v.name}
                          </h3>
                        </div>

                        <p className={`text-xs mt-1.5 pl-4 border-l ${index === 0 ? 'border-purple-500 text-purple-200' : 'border-gray-700 text-gray-300'}`}
                          style={{
                            textShadow: index === 0 ? '0 0 15px rgba(139, 92, 246, 0.4)' : 'none'
                          }}
                        >{v.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="px-4 pt-2 pb-3 bg-gray-900/50">
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60 mb-2"></div>
                  <div className="text-center text-xs text-gray-400 flex justify-center items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {versions[0].name}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Mobile version (below md) */}
      <motion.div
        className="block [@media(min-width:1000px)]:hidden fixed bottom-6 right-6 z-50 rounded-2xl backdrop-blur-md min-w-65"
        style={{
          background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.8) 0%, rgba(17, 24, 39, 0.95) 100%)',
          boxShadow: '0 0 15px rgba(59, 130, 246, 0.3), 0 0 30px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          transformOrigin: 'bottom right'
        }}
        initial={{ width: '120px' }}
        whileHover={{
          scale: 1.05,
          transition: { duration: 0.3, ease: "easeOut" }
        }}
      >
        <div
          className="relative h-full w-full"
          onMouseEnter={() => setVersionsHovered(true)}
          onMouseLeave={() => setVersionsHovered(false)}
        >
          <div className="flex items-center justify-center p-2 h-12">
            <motion.div
              className="text-base font-semibold text-white flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>{versions[0].name}</span>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </>
  );
}


export default VersionChangelog;