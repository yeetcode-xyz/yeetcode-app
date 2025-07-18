import React, { useState } from 'react';
import { useAnalytics } from '../utils/analytics';

const EmailStep = ({
  animationClass,
  error,
  setError,
  validating,
  setValidating,
  handleEmailSent,
}) => {
  const analytics = useAnalytics();
  const [email, setEmail] = useState('');

  const handleSendMagicLink = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setValidating(true);
    try {
      if (window.electronAPI) {
        console.log('Sending magic link to:', email);
        const result = await window.electronAPI.sendMagicLink(email);
        console.log('Magic link result:', result);

        if (!result.success) {
          setError(result.error || 'Failed to send verification code');
          return;
        }

        // Track magic link sent
        analytics.trackFeatureUsed('magic_link_sent', { email });

        // Navigate to verification step
        handleEmailSent(email);
      } else {
        // Mock for development
        console.log('Mock sending magic link to:', email);
        handleEmailSent(email);
      }
    } catch (err) {
      console.error('Error sending magic link:', err);
      setError(`Error: ${err.message || 'Failed to send verification code'}`);
    } finally {
      setValidating(false);
    }
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      handleSendMagicLink();
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${animationClass}`}>
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold">Welcome to YeetCode!</h2>
        <p className="text-gray-600 text-sm mt-1">
          Enter your email to get started with secure magic link authentication
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">Email Address</label>
          <input
            type="email"
            className="border-2 border-black rounded-lg px-3 py-2 w-full focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="your.email@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={validating}
          />
          <p className="text-xs text-gray-500 mt-1">
            We'll send you a 6-digit verification code
          </p>
        </div>
      </div>

      {error && (
        <div className="text-red-600 font-bold p-3 bg-red-50 border-2 border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={handleSendMagicLink}
        disabled={validating || !email.trim()}
        className={`w-full px-4 py-3 ${
          validating || !email.trim()
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white btn-3d'
        } border-2 border-black rounded-lg font-bold text-lg transition-colors`}
      >
        {validating ? (
          <div className="flex items-center justify-center gap-2">
            <span>📧</span>
            <span>Sending...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span>🚀</span>
            <span>Send Verification Code</span>
          </div>
        )}
      </button>

      <div className="text-center text-xs text-gray-500 mt-2">
        <p>
          By continuing, you agree to join the most competitive LeetCode
          platform ever built! 💪
        </p>
      </div>
    </div>
  );
};

export default EmailStep;
