import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

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
  const [step, setStep] = useState('login');
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [leetUsername, setLeetUsername] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [myGroupCode, setMyGroupCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [refreshIn, setRefreshIn] = useState(60);
  const [error, setError] = useState('');

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

  // Steps: login -> onboarding -> group -> leaderboard
  const handleLogin = async () => {
    setError('');
    if (username === 'Hi' && password === 'bye') {
      setUser({ name: username });
      setStep('onboarding');
    } else {
      setError('Invalid username or password');
    }
  };

  const handleValidateLeet = async () => {
    // Assume always valid
    setStep('group');
  };

  const handleJoinGroup = async () => {
    setError('');
    // Accept any code for now
    setJoined(true);
    setStep('leaderboard');
    fetchLeaderboard();
  };

  const handleCreateGroup = async () => {
    // Generate dummy code
    setMyGroupCode('12345');
    setJoined(true);
    setStep('leaderboard');
    fetchLeaderboard();
  };

  // UI
  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-2xl shadow-2xl bg-white border-4 border-black min-h-[400px] flex flex-col gap-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
      <h1 className="text-2xl font-bold mb-2 text-center border-b-4 border-black pb-2">LeetCode Group Leaderboard</h1>
      {step === 'login' && (
        <form onSubmit={e => { e.preventDefault(); handleLogin(); }} className="flex flex-col gap-4">
          <input className="border-2 border-black rounded-lg px-3 py-2" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input className="border-2 border-black rounded-lg px-3 py-2" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full py-3 bg-yellow-300 border-2 border-black rounded-lg font-bold text-lg hover:bg-yellow-400 transition">Login</button>
          {error && <div className="text-red-600 font-bold">{error}</div>}
        </form>
      )}
      {step === 'onboarding' && (
        <div className="flex flex-col gap-4">
          <input className="border-2 border-black rounded-lg px-3 py-2" placeholder="Your Name" value={user?.name || ''} disabled />
          <div className="flex gap-2 items-center">
            <input className="border-2 border-black rounded-lg px-3 py-2 flex-1" placeholder="LeetCode Username" value={leetUsername} onChange={e => setLeetUsername(e.target.value)} />
            <button onClick={handleValidateLeet} className="px-4 py-2 bg-green-300 border-2 border-black rounded-lg font-bold hover:bg-green-400">Continue</button>
          </div>
        </div>
      )}
      {step === 'group' && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <input className="border-2 border-black rounded-lg px-3 py-2 flex-1" placeholder="Invite Code" value={groupCode} onChange={e => setGroupCode(e.target.value)} />
            <button onClick={handleJoinGroup} className="px-4 py-2 bg-blue-300 border-2 border-black rounded-lg font-bold hover:bg-blue-400">Join Group</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCreateGroup} className="px-4 py-2 bg-pink-300 border-2 border-black rounded-lg font-bold hover:bg-pink-400">Create Group</button>
            {myGroupCode && <span className="font-mono text-lg">Code: {myGroupCode}</span>}
          </div>
        </div>
      )}
      {step === 'leaderboard' && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="font-bold">Group Code: <span className="font-mono">{myGroupCode || groupCode}</span></span>
            <span className="text-sm">Refreshes in: {refreshIn}s</span>
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
                  <tr key={u.name} className={u.name === 'You' ? 'bg-pink-200 font-bold' : 'bg-white'}>
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
    </div>
  );
}

// Update to use createRoot (React 18)
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />); 