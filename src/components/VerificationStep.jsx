import React, { useState, useRef, useEffect } from 'react';
import { useAnalytics } from '../utils/analytics';

const VerificationStep = ({
  animationClass,
  error,
  setError,
  validating,
  setValidating,
  email,
  handleVerificationSuccess,
  handleResendCode,
  handleBackToEmail,
}) => {
  const analytics = useAnalytics();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const inputRefs = useRef([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleInputChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (newCode.every(digit => digit !== '') && value) {
      handleVerifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle Enter
    if (e.key === 'Enter') {
      handleVerifyCode(code.join(''));
    }
  };

  const handlePaste = e => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const pastedCode = pastedData.replace(/\D/g, '').slice(0, 6);

    if (pastedCode.length === 6) {
      const newCode = pastedCode.split('');
      setCode(newCode);
      handleVerifyCode(pastedCode);
    }
  };

  const handleVerifyCode = async (codeToVerify = null) => {
    const verificationCode = codeToVerify || code.join('');
    setError('');

    if (verificationCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setValidating(true);
    try {
      if (window.electronAPI) {
        console.log('Verifying code for:', email);
        const result = await window.electronAPI.verifyMagicToken(
          email,
          verificationCode
        );
        console.log('Verification result:', result);

        if (!result.success) {
          setError(result.error || 'Invalid verification code');
          // Clear the code inputs on error
          setCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
          return;
        }

        // Track successful verification
        analytics.trackFeatureUsed('magic_link_verified', { email });

        // Navigate to onboarding
        handleVerificationSuccess(result);
      } else {
        // Mock for development
        console.log('Mock verifying code:', verificationCode);
        handleVerificationSuccess({ success: true, email, verified: true });
      }
    } catch (err) {
      console.error('Error verifying code:', err);
      setError(`Error: ${err.message || 'Failed to verify code'}`);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setValidating(false);
    }
  };

  const onResendCodeClick = async () => {
    setError('');
    setValidating(true);
    try {
      await handleResendCode();
      setTimeLeft(600); // Reset timer
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError('Failed to resend code');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${animationClass}`}>
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold">Check your email!</h2>
        <p className="text-gray-600 text-sm mt-1">
          We sent a 6-digit verification code to
        </p>
        <p className="text-blue-600 font-bold text-sm">{email}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-3 text-center">
            Enter Verification Code
          </label>
          <div className="flex justify-center gap-2 mb-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => (inputRefs.current[index] = el)}
                type="text"
                maxLength="1"
                className="w-12 h-12 text-center text-xl font-bold border-2 border-black rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white"
                value={digit}
                onChange={e => handleInputChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={validating}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center">
            Code expires in:{' '}
            <span className="font-bold text-orange-600">
              {formatTime(timeLeft)}
            </span>
          </p>
        </div>
      </div>

      {error && (
        <div className="text-red-600 font-bold p-3 bg-red-50 border-2 border-red-200 rounded-lg">
          {error}
        </div>
      )}

      {validating && (
        <div className="text-center">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <span className="animate-spin">⏳</span>
              <span className="font-bold">Verifying code...</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={onResendCodeClick}
          disabled={validating || timeLeft > 540} // Can resend after 1 minute
          className={`w-full px-4 py-2 ${
            validating || timeLeft > 540
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-yellow-300 hover:bg-yellow-400 text-black btn-3d'
          } border-2 border-black rounded-lg font-bold transition-colors`}
        >
          {timeLeft > 540
            ? `Resend available in ${formatTime(timeLeft - 540)}`
            : '📧 Resend Code'}
        </button>

        <button
          onClick={handleBackToEmail}
          disabled={validating}
          className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-black rounded-lg font-bold transition-colors"
        >
          ← Change Email Address
        </button>
      </div>

      <div className="text-center text-xs text-gray-500 mt-2">
        <p>🔒 Your email will be securely stored and never shared</p>
      </div>
    </div>
  );
};

export default VerificationStep;
