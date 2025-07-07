import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the group functionality functions
const mockElectronAPI = {
  joinGroup: vi.fn(),
  getStatsForGroup: vi.fn(),
  createGroup: vi.fn(),
  leaveGroup: vi.fn(),
};

// Simple test component for group functionality
const GroupTest = () => {
  const [groupCode, setGroupCode] = React.useState('');
  const [joined, setJoined] = React.useState(false);
  const [leaderboard, setLeaderboard] = React.useState([]);
  const [error, setError] = React.useState('');

  const handleJoinGroup = async () => {
    try {
      setError('');
      await mockElectronAPI.joinGroup('testuser', groupCode);
      const data = await mockElectronAPI.getStatsForGroup(groupCode);
      setLeaderboard(data);
      setJoined(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {!joined ? (
        <div>
          <input
            data-testid="group-input"
            placeholder="Enter group code"
            value={groupCode}
            onChange={e => setGroupCode(e.target.value)}
          />
          <button data-testid="join-button" onClick={handleJoinGroup}>
            Join Group
          </button>
          {error && <div data-testid="error">{error}</div>}
        </div>
      ) : (
        <div>
          <div data-testid="group-display">Group: {groupCode}</div>
          <div data-testid="leaderboard">
            {leaderboard.map(user => (
              <div key={user.username} data-testid={`user-${user.username}`}>
                {user.username}: {user.easy + user.medium + user.hard} total
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

describe('Group Functionality Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock functions
    mockElectronAPI.joinGroup.mockResolvedValue({ joined: true });
    mockElectronAPI.getStatsForGroup.mockResolvedValue([]);
  });

  it('should join group 43837 and display leaderboard', async () => {
    // Mock successful group join and leaderboard data
    mockElectronAPI.joinGroup.mockResolvedValue({
      joined: true,
      groupId: '43837',
    });
    mockElectronAPI.getStatsForGroup.mockResolvedValue([
      {
        username: 'sidmo2006',
        easy: 0,
        medium: 0,
        hard: 0,
        today: 0,
      },
      {
        username: 'KshitijNdev',
        easy: 0,
        medium: 0,
        hard: 0,
        today: 0,
      },
    ]);

    render(<GroupTest />);

    // Enter group code 43837
    const input = screen.getByTestId('group-input');
    fireEvent.change(input, { target: { value: '43837' } });
    expect(input.value).toBe('43837');

    // Click join button
    const joinButton = screen.getByTestId('join-button');
    fireEvent.click(joinButton);

    // Wait for join operation to complete
    await waitFor(() => {
      expect(mockElectronAPI.joinGroup).toHaveBeenCalledWith(
        'testuser',
        '43837'
      );
      expect(mockElectronAPI.getStatsForGroup).toHaveBeenCalledWith('43837');
    });

    // Verify group display
    await waitFor(() => {
      expect(screen.getByTestId('group-display')).toHaveTextContent(
        'Group: 43837'
      );
    });

    // Verify leaderboard users are displayed
    await waitFor(() => {
      expect(screen.getByTestId('user-sidmo2006')).toBeInTheDocument();
      expect(screen.getByTestId('user-KshitijNdev')).toBeInTheDocument();
    });
  });

  it('should handle group join errors', async () => {
    // Mock join failure
    mockElectronAPI.joinGroup.mockRejectedValue(
      new Error('Failed to join group')
    );

    render(<GroupTest />);

    const input = screen.getByTestId('group-input');
    fireEvent.change(input, { target: { value: '43837' } });

    const joinButton = screen.getByTestId('join-button');
    fireEvent.click(joinButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Failed to join group'
      );
    });

    // Verify we didn't fetch leaderboard data
    expect(mockElectronAPI.getStatsForGroup).not.toHaveBeenCalled();
  });

  it('should handle empty leaderboard', async () => {
    // Mock successful join but empty leaderboard
    mockElectronAPI.joinGroup.mockResolvedValue({
      joined: true,
      groupId: '43837',
    });
    mockElectronAPI.getStatsForGroup.mockResolvedValue([]);

    render(<GroupTest />);

    const input = screen.getByTestId('group-input');
    fireEvent.change(input, { target: { value: '43837' } });

    const joinButton = screen.getByTestId('join-button');
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(screen.getByTestId('group-display')).toHaveTextContent(
        'Group: 43837'
      );
    });

    // Verify leaderboard is empty
    const leaderboard = screen.getByTestId('leaderboard');
    expect(leaderboard.children).toHaveLength(0);
  });

  it('should validate input handling', () => {
    render(<GroupTest />);

    const input = screen.getByTestId('group-input');

    // Test input accepts group codes
    fireEvent.change(input, { target: { value: '43837' } });
    expect(input.value).toBe('43837');

    // Test input can be cleared
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');

    // Test button is present
    expect(screen.getByTestId('join-button')).toBeInTheDocument();
  });
});
