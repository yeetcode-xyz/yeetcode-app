import React from 'react';

const GroupStep = ({
  animationClass,
  error,
  groupData,
  setGroupData,
  handleJoinGroup,
  handleCreateGroup,
}) => {
  return (
    <div className={`flex flex-col gap-4 ${animationClass}`}>
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold">Join or Create a Group</h2>
        <p className="text-sm text-gray-600">
          Connect with friends and start competing!
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">
            Join Existing Group
          </label>
          <div className="flex gap-2">
            <input
              className="border-2 border-black rounded-lg px-3 py-2 flex-1 focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="Enter invite code"
              value={groupData.code}
              onChange={e =>
                setGroupData({ ...groupData, code: e.target.value })
              }
            />
            <button
              onClick={handleJoinGroup}
              className="px-4 py-2 bg-green-500 hover:bg-green-700 text-white border-2 border-black rounded-lg font-bold btn-3d"
            >
              Join Group
            </button>
          </div>
        </div>

        <div className="text-center">
          <span className="text-sm text-gray-500">or</span>
        </div>

        <div className="text-center">
          <button
            onClick={handleCreateGroup}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-2 border-black rounded-lg font-bold btn-3d"
          >
            Create New Group
          </button>
        </div>

        {/* Development skip option */}
        {import.meta.env.DEV && (
          <div className="text-center pt-4 border-t-2 border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Development Mode</p>
            <button
              onClick={() => window.devHelpers.skipGroup()}
              className="px-3 py-1 bg-red-400 hover:bg-red-600 text-white border-2 border-black rounded-lg text-sm font-bold btn-3d"
            >
              Skip Group Setup
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-600 font-bold p-3 bg-red-50 border-2 border-red-200 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default GroupStep;
