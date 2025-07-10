import React from 'react';
import LeaderboardHeader from './leaderboard/LeaderboardHeader';
import TodaysChallenge from './leaderboard/TodaysChallenge';
import FriendsLeaderboard from './leaderboard/FriendsLeaderboard';
import DuelsSection from './leaderboard/DuelsSection';
import UserStats from './leaderboard/UserStats';
import ActiveBounties from './leaderboard/ActiveBounties';
import QuickActions from './leaderboard/QuickActions';

const LeaderboardStep = ({
  animationClass,
  userData,
  groupData,
  leaderboard,
  dailyData,
  refreshIn,
  showCopySuccess,
  setShowCopySuccess,
  handleLeaveGroup,
}) => {
  return (
    <div className={`flex flex-col gap-6 ${animationClass}`}>
      <LeaderboardHeader
        userData={userData}
        groupData={groupData}
        refreshIn={refreshIn}
        showCopySuccess={showCopySuccess}
        setShowCopySuccess={setShowCopySuccess}
        handleLeaveGroup={handleLeaveGroup}
      />

      {/* 3-Column Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Content - Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          <TodaysChallenge userData={userData} dailyData={dailyData} />
          <FriendsLeaderboard leaderboard={leaderboard} userData={userData} />
          <DuelsSection leaderboard={leaderboard} userData={userData} />
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          <UserStats
            userData={userData}
            leaderboard={leaderboard}
            dailyData={dailyData}
          />
          <ActiveBounties
            userData={userData}
            leaderboard={leaderboard}
            dailyData={dailyData}
          />
          <QuickActions groupData={groupData} />
        </div>
      </div>
    </div>
  );
};

export default LeaderboardStep;
