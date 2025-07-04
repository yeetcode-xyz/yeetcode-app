import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// Check if electronAPI is available
console.log('Checking for electronAPI:', window.electronAPI ? 'Available' : 'Not available');
if (!window.electronAPI) {
  console.error('electronAPI is not available. This may be due to preload script not being loaded correctly.');
}

// Dummy leaderboard fetch
const mockFetchLeaderboard = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return [
    { name: 'Alice', easy: 50, medium: 30, hard: 10, today: 2 },
    { name: 'Bob', easy: 45, medium: 25, hard: 8, today: 1 },
    { name: 'You', easy: 40, medium: 20, hard: 5, today: 3 },
  ];
};

function App() {
  const [step, setStep] = useState('welcome');
  const [user, setUser] = useState({ name: '' });
  const [leetUsername, setLeetUsername] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [myGroupCode, setMyGroupCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [refreshIn, setRefreshIn] = useState(60);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [electronAPIAvailable, setElectronAPIAvailable] = useState(!!window.electronAPI);
  const [showSuccess, setShowSuccess] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    // Check if electronAPI is available
    setElectronAPIAvailable(!!window.electronAPI);
    if (!window.electronAPI) {
      setError('electronAPI is not available. This app may not work correctly.');
    }
  }, []);

  // Handle leaderboard refresh
  useEffect(() => {
    let timer;
    if (step === 'leaderboard') {
      timer = setInterval(() => {
        setRefreshIn((r) => (r > 1 ? r - 1 : 60));
        if (refreshIn === 1) fetchLeaderboard();
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, refreshIn]);

  const fetchLeaderboard = async () => {
    const data = await mockFetchLeaderboard();
    // Add total and sort
    const withTotal = data.map((u) => ({ ...u, total: u.easy + u.medium + u.hard }));
    withTotal.sort((a, b) => b.total - a.total);
    setLeaderboard(withTotal);
  };

  const handleStartOnboarding = () => {
    setAnimationClass('fade-out');
    setTimeout(() => {
      setStep('onboarding');
      setAnimationClass('fade-in');
    }, 300);
  };

  const handleValidateLeet = async () => {
    setError('');
    
    if (!leetUsername.trim()) {
      setError('Please enter your LeetCode username');
      return;
    }
    
    if (!user.name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    // Check if electronAPI is available
    if (!window.electronAPI) {
      setError('electronAPI is not available. Cannot validate username.');
      return;
    }
    
    setValidating(true);
    
    try {
      // Call the API through the preload bridge
      console.log('Calling validateLeetCodeUsername with:', leetUsername);
      const result = await window.electronAPI.validateLeetCodeUsername(leetUsername);
      console.log('Validation result in renderer:', result);
      
      // Handle various response formats
      if (result && result.exists === true) {
        // Success case - username exists
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setAnimationClass('fade-out');
          setTimeout(() => {
            setStep('group');
            setAnimationClass('fade-in');
          }, 300);
        }, 2000);
      } else if (result && result.exists === false && result.error) {
        // Error case - username doesn't exist
        setError(`Username validation failed: ${result.error}`);
      } else {
        // Fallback error case
        setError('Username validation failed. Please try again.');
      }
    } catch (err) {
      console.error('Error in validation:', err);
      setError(`Error: ${err.message || 'Failed to validate username'}`);
    } finally {
      setValidating(false);
    }
  };

  const handleJoinGroup = async () => {
    setError('');
    // Accept any code for now
    setJoined(true);
    setAnimationClass('fade-out');
    setTimeout(() => {
      setStep('leaderboard');
      setAnimationClass('fade-in');
      fetchLeaderboard();
    }, 300);
  };

  const handleCreateGroup = async () => {
    // Generate dummy code
    setMyGroupCode('12345');
    setJoined(true);
    setAnimationClass('fade-out');
    setTimeout(() => {
      setStep('leaderboard');
      setAnimationClass('fade-in');
      fetchLeaderboard();
    }, 300);
  };

  const handleChangeUsername = () => {
    setEditingUsername(true);
  };

  const handleSaveUsername = () => {
    setEditingUsername(false);
    // Reset the validation process
    setError('');
    setValidating(false);
  };

  // UI
  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-2xl shadow-2xl bg-white border-4 border-black min-h-[400px] flex flex-col gap-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
      <h1 className="text-2xl font-bold mb-2 text-center border-b-4 border-black pb-2">YeetCode</h1>
      
      {step === 'welcome' && (
        <div className={`flex flex-col gap-6 ${animationClass}`}>
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Welcome to YeetCode! 🚀</h2>
            <p className="text-sm mb-4">
              The ultimate competitive coding platform that makes LeetCode practice fun and social!
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">How it works:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Connect your LeetCode account</li>
                <li>• Join or create a study group</li>
                <li>• Compete with friends on the leaderboard</li>
                <li>• Track your progress in real-time</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <h3 className="font-bold text-green-800 mb-2">Leaderboard Features:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Real-time ranking updates</li>
                <li>• Easy/Medium/Hard problem tracking</li>
                <li>• Daily progress monitoring</li>
                <li>• Group competition and motivation</li>
              </ul>
            </div>
          </div>
          
          <button 
            onClick={handleStartOnboarding}
            className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 border-2 border-black rounded-lg font-bold text-white shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Get Started! 🎯
          </button>
        </div>
      )}
      
      {step === 'onboarding' && (
        <div className={`flex flex-col gap-4 ${animationClass}`}>
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold">Let's get you set up!</h2>
            <p className="text-sm text-gray-600">Enter your details to join the competition</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Your Name</label>
              <input 
                className="border-2 border-black rounded-lg px-3 py-2 w-full focus:border-blue-500 focus:outline-none transition-colors" 
                placeholder="Enter your full name" 
                value={user?.name || ''} 
                onChange={e => setUser({...user, name: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-1">LeetCode Username</label>
              <div className="flex gap-2">
                <input 
                  className="border-2 border-black rounded-lg px-3 py-2 flex-1 focus:border-blue-500 focus:outline-none transition-colors" 
                  placeholder="Your LeetCode username" 
                  value={leetUsername} 
                  onChange={e => setLeetUsername(e.target.value)} 
                />
                <button 
                  onClick={handleValidateLeet} 
                  disabled={validating}
                  className={`px-4 py-2 ${validating ? 'bg-gray-300' : 'bg-green-300 hover:bg-green-400'} border-2 border-black rounded-lg font-bold transition-all duration-200 ${!validating ? 'hover:scale-105' : ''}`}
                >
                  {validating ? 'Checking...' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="text-red-600 font-bold p-3 bg-red-50 border-2 border-red-200 rounded-lg animate-pulse">
              {error}
            </div>
          )}
          
          {showSuccess && (
            <div className="text-green-600 font-bold p-3 bg-green-50 border-2 border-green-200 rounded-lg animate-bounce text-center">
              ✅ Username validated successfully! Redirecting...
            </div>
          )}
        </div>
      )}
      
      {step === 'group' && (
        <div className={`flex flex-col gap-4 ${animationClass}`}>
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold">Join or Create a Group</h2>
            <p className="text-sm text-gray-600">Connect with friends and start competing!</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1">Join Existing Group</label>
              <div className="flex gap-2">
                <input 
                  className="border-2 border-black rounded-lg px-3 py-2 flex-1 focus:border-blue-500 focus:outline-none transition-colors" 
                  placeholder="Enter invite code" 
                  value={groupCode} 
                  onChange={e => setGroupCode(e.target.value)} 
                />
                <button 
                  onClick={handleJoinGroup} 
                  className="px-4 py-2 bg-blue-300 border-2 border-black rounded-lg font-bold hover:bg-blue-400 transition-all duration-200 hover:scale-105"
                >
                  Join Group
                </button>
              </div>
            </div>
            
            <div className="text-center">
              <span className="text-sm text-gray-500">or</span>
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-1">Create New Group</label>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCreateGroup} 
                  className="px-4 py-2 bg-pink-300 border-2 border-black rounded-lg font-bold hover:bg-pink-400 transition-all duration-200 hover:scale-105"
                >
                  Create Group
                </button>
                {myGroupCode && (
                  <span className="font-mono text-lg bg-yellow-100 p-2 rounded border-2 border-yellow-300">
                    Code: {myGroupCode}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {step === 'leaderboard' && (
        <div className={`flex flex-col gap-4 ${animationClass}`}>
          <div className="flex justify-between items-center">
            <span className="font-bold">Group Code: <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{myGroupCode || groupCode}</span></span>
            <span className="text-sm">Refreshes in: {refreshIn}s</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold">User: {user?.name}</span>
            <button 
              onClick={() => {
                setAnimationClass('fade-out');
                setTimeout(() => {
                  setStep('onboarding');
                  setAnimationClass('fade-in');
                }, 300);
              }} 
              className="px-3 py-1 bg-yellow-300 border-2 border-black rounded-lg text-sm hover:bg-yellow-400 transition-all duration-200 hover:scale-105"
            >
              Change Username
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-2 border-black rounded-lg">
              <thead>
                <tr className="bg-yellow-200 border-b-2 border-black">
                  <th className="px-2 py-1 border-r-2 border-black">#</th>
                  <th className="px-2 py-1 border-r-2 border-black">Name</th>
                  <th className="px-2 py-1 border-r-2 border-black">Easy</th>
                  <th className="px-2 py-1 border-r-2 border-black">Med</th>
                  <th className="px-2 py-1 border-r-2 border-black">Hard</th>
                  <th className="px-2 py-1 border-r-2 border-black">Total</th>
                  <th className="px-2 py-1">Today</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((u, i) => (
                  <tr key={u.name} className={`${u.name === 'You' ? 'bg-pink-200 font-bold' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                    <td className="px-2 py-1 border-r-2 border-black text-center">{i + 1}</td>
                    <td className="px-2 py-1 border-r-2 border-black">{u.name}</td>
                    <td className="px-2 py-1 border-r-2 border-black text-center">{u.easy}</td>
                    <td className="px-2 py-1 border-r-2 border-black text-center">{u.medium}</td>
                    <td className="px-2 py-1 border-r-2 border-black text-center">{u.hard}</td>
                    <td className="px-2 py-1 border-r-2 border-black text-center">{u.total}</td>
                    <td className="px-2 py-1 text-center">{u.today}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.3s ease-in;
        }
        .fade-out {
          animation: fadeOut 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}

// Update to use createRoot (React 18)
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />); 