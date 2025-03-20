import React from 'react';
import { TrafficLightData } from '../hooks/useWebSocket';

interface TrafficLightComponentProps {
  data: TrafficLightData;
  activeLight: 'red' | 'yellow' | 'green';
  onLightSelect: (light: 'red' | 'yellow' | 'green') => void;
}

const TrafficLightComponent: React.FC<TrafficLightComponentProps> = ({
  data,
  activeLight,
  onLightSelect,
}) => {
  // Calculate total users to show percentages
  const totalUsers = data.lights.red + data.lights.yellow + data.lights.green;

  // Function to get percentage of users on a specific light
  const getPercentage = (count: number): string => {
    if (totalUsers === 0) return '0%';
    return `${Math.round((count / totalUsers) * 100)}%`;
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center md:items-start gap-6 md:gap-8 w-full max-w-6xl mx-auto px-4">
      {/* Traffic Light */}
      <div className="bg-gray-800 p-6 rounded-3xl shadow-lg relative">
        <div className="w-40 bg-gray-700 rounded-3xl p-4 flex flex-col items-center space-y-6">
          {/* Red Light */}
          <button
            onClick={() => onLightSelect('red')}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
              activeLight === 'red'
                ? 'bg-red-600 ring-4 ring-red-300 shadow-lg shadow-red-500/50'
                : 'bg-red-900/40'
            } transition-all duration-300 hover:bg-red-600/90`}
          >
            <div className={`absolute -top-2 -right-2 bg-gray-800 rounded-full px-2 py-1 text-xs ${
              data.lights.red > 0 ? 'text-white' : 'text-gray-400'
            }`}>
              {data.lights.red}
            </div>
            {activeLight === 'red' && (
              <div className="absolute inset-0 rounded-full animate-ping bg-red-600 opacity-20"></div>
            )}
          </button>

          {/* Yellow Light */}
          <button
            onClick={() => onLightSelect('yellow')}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
              activeLight === 'yellow'
                ? 'bg-yellow-400 ring-4 ring-yellow-200 shadow-lg shadow-yellow-400/50'
                : 'bg-yellow-900/40'
            } transition-all duration-300 hover:bg-yellow-400/90`}
          >
            <div className={`absolute -top-2 -right-2 bg-gray-800 rounded-full px-2 py-1 text-xs ${
              data.lights.yellow > 0 ? 'text-white' : 'text-gray-400'
            }`}>
              {data.lights.yellow}
            </div>
            {activeLight === 'yellow' && (
              <div className="absolute inset-0 rounded-full animate-ping bg-yellow-400 opacity-20"></div>
            )}
          </button>

          {/* Green Light */}
          <button
            onClick={() => onLightSelect('green')}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center ${
              activeLight === 'green'
                ? 'bg-green-500 ring-4 ring-green-300 shadow-lg shadow-green-500/50'
                : 'bg-green-900/40'
            } transition-all duration-300 hover:bg-green-500/90`}
          >
            <div className={`absolute -top-2 -right-2 bg-gray-800 rounded-full px-2 py-1 text-xs ${
              data.lights.green > 0 ? 'text-white' : 'text-gray-400'
            }`}>
              {data.lights.green}
            </div>
            {activeLight === 'green' && (
              <div className="absolute inset-0 rounded-full animate-ping bg-green-500 opacity-20"></div>
            )}
          </button>
        </div>
        
        {/* Traffic Light Stand */}
        <div className="w-8 h-32 bg-gray-700 mx-auto mt-4 rounded-b-lg"></div>
      </div>

      {/* Stats Display - Hidden on mobile (< 768px) */}
      <div className="hidden md:block bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-md md:self-center">
        <h3 className="text-xl font-semibold mb-4 text-center md:text-left">Studentský feedback</h3>
        
        <div className="space-y-4">
          {/* Red Light Stats */}
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <div className="text-sm text-gray-300 w-16">Pomoc!</div>
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div 
                className="bg-red-500 h-3 rounded-full" 
                style={{ width: getPercentage(data.lights.red) }}
              ></div>
            </div>
            <div className="ml-3 text-sm font-medium w-20 text-right">
              {data.lights.red} studentů ({getPercentage(data.lights.red)})
            </div>
          </div>
          
          {/* Yellow Light Stats */}
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
            <div className="text-sm text-gray-300 w-16">Zpomal</div>
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div 
                className="bg-yellow-400 h-3 rounded-full" 
                style={{ width: getPercentage(data.lights.yellow) }}
              ></div>
            </div>
            <div className="ml-3 text-sm font-medium w-20 text-right">
              {data.lights.yellow} studentů ({getPercentage(data.lights.yellow)})
            </div>
          </div>
          
          {/* Green Light Stats */}
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <div className="text-sm text-gray-300 w-16">Jedem!</div>
            <div className="flex-1 bg-gray-700 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full" 
                style={{ width: getPercentage(data.lights.green) }}
              ></div>
            </div>
            <div className="ml-3 text-sm font-medium w-20 text-right">
              {data.lights.green} studentů ({getPercentage(data.lights.green)})
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-center md:text-left text-gray-400 text-sm">
            Celkem studentů: <span className="font-medium text-white">{totalUsers}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrafficLightComponent; 