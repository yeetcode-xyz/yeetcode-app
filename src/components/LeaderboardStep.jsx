import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import LeaderboardHeader from './leaderboard/LeaderboardHeader';
import TodaysChallenge from './leaderboard/TodaysChallenge';
import FriendsLeaderboard from './leaderboard/FriendsLeaderboard';
import DuelsSection from './leaderboard/DuelsSection';
import UserStats from './leaderboard/UserStats';
import ActiveBounties from './leaderboard/ActiveBounties';
import QuickActions from './leaderboard/QuickActions';

const LeaderboardStep = forwardRef(
  (
    {
      animationClass,
      userData,
      groupData,
      leaderboard,
      universityLeaderboard,
      dailyData,
      refreshIn,
      showCopySuccess,
      setShowCopySuccess,
      notifications,
      handleLeaveGroup,
      handleDailyComplete,
      quickActionsProps = {},
    },
    ref
  ) => {
    const duelsSectionRef = useRef();

    // Expose refresh function to parent component
    useImperativeHandle(ref, () => ({
      refreshDuels: () => {
        if (duelsSectionRef.current) {
          duelsSectionRef.current.refreshDuels();
        }
      },
    }));
    return (
      <div className={`flex flex-col gap-6 ${animationClass}`}>
        <LeaderboardHeader
          userData={userData}
          groupData={groupData}
          refreshIn={refreshIn}
          showCopySuccess={showCopySuccess}
          setShowCopySuccess={setShowCopySuccess}
          notifications={notifications}
          handleLeaveGroup={handleLeaveGroup}
        />

        {/* 3-Column Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Content - Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            <TodaysChallenge
              userData={userData}
              dailyData={dailyData}
              onDailyComplete={handleDailyComplete}
            />
            <FriendsLeaderboard
              leaderboard={leaderboard}
              universityLeaderboard={universityLeaderboard}
              userData={userData}
              notifications={notifications}
            />
            <DuelsSection
              ref={duelsSectionRef}
              leaderboard={leaderboard}
              userData={userData}
            />
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
            <QuickActions groupData={groupData} {...quickActionsProps} />
          </div>
        </div>
      </div>
    );
  }
);

export default LeaderboardStep;
