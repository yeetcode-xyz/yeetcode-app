import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';

// Update to use createRoot (React 18)
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render without PostHog dependency - analytics now handled securely via IPC
root.render(<App />);
