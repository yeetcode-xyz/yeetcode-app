import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';
import { PostHogProvider } from 'posthog-js/react';

const POSTHOG_KEY = window.envVars?.posthogKey;
const POSTHOG_HOST = window.envVars?.posthogHost || 'https://app.posthog.com';

const options = {
  api_host: POSTHOG_HOST,
  loaded: posthog => {
    if (window.envVars?.nodeEnv === 'development') {
      console.log('PostHog loaded successfully');
    }
  },
  // Electron app specific configurations
  persistence: 'localStorage',
};

// Update to use createRoot (React 18)
const root = ReactDOM.createRoot(document.getElementById('root'));

// Only wrap with PostHog if we have a valid key
if (
  POSTHOG_KEY &&
  POSTHOG_KEY !== 'ph-test-key' &&
  !POSTHOG_KEY.includes('your-')
) {
  root.render(
    <PostHogProvider apiKey={POSTHOG_KEY} options={options}>
      <App />
    </PostHogProvider>
  );
} else {
  console.warn(
    'PostHog disabled: No valid API key found. Add POSTHOG_KEY to your .env file'
  );
  root.render(<App />);
}
