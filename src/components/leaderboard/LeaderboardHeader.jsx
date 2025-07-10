import React from 'react';

const LeaderboardHeader = ({
  userData,
  groupData,
  refreshIn,
  showCopySuccess,
  setShowCopySuccess,
  handleLeaveGroup,
}) => {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(groupData.code);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 2000);
  };

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <span className="font-bold text-lg">
          Group:{' '}
          <span
            className="font-mono bg-yellow-200 px-3 py-1 rounded-lg border-2 border-black cursor-pointer hover:bg-yellow-300 transition-colors relative group"
            onClick={handleCopyCode}
            title="Copy Me!"
          >
            {groupData.code}
            {showCopySuccess ? (
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                ✅ Copied!
              </span>
            ) : (
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Copy Me!
              </span>
            )}
          </span>
        </span>
        <span className="text-sm text-gray-600">
          User: {userData.name} ({userData.leetUsername})
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          Refreshes in: {refreshIn}s
        </span>
        <button
          onClick={handleLeaveGroup}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 border-2 border-black rounded-lg font-bold text-white btn-3d"
        >
          Leave Group
        </button>
      </div>
    </div>
  );
};

export default LeaderboardHeader;
