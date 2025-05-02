import React from 'react';

// Define a type for Project props
interface Project {
  title: string;
  description: string;
  url: string;
  // Add other properties like image url, tags, etc. if needed
}

// Example project data (replace or add more as needed)
const projects: Project[] = [
  {
    title: 'Traffic Light Simulation',
    description: 'A simple traffic light simulation built with React and TypeScript.',
    url: '/traffic-light/',
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
  return (
    <a
      href={project.url}
      className="block bg-gray-700 p-6 rounded-lg shadow-lg transform transition duration-300 ease-in-out hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
    >
      <h2 className="text-xl font-semibold text-white mb-2">{project.title}</h2>
      <p className="text-gray-400 mb-4">{project.description}</p>
      <span className="inline-block text-blue-400 hover:text-blue-300 transition duration-300">
        View Project &rarr;
      </span>
    </a>
  );
}

// Main App Component
function App(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300 flex flex-col items-center p-6 md:p-12">
      <header className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Pavel Falta's Projects</h1>
        <p className="text-lg md:text-xl text-gray-400">A showcase of my work.</p>
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
