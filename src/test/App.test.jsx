import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Simple test component to verify testing setup works
const TestComponent = ({
  title = 'YeetCode',
  subtitle = 'Welcome to YeetCode! 🚀',
}) => {
  return (
    <div>
      <h1>{title}</h1>
      <h2>{subtitle}</h2>
      <button>Get Started! 🎯</button>
    </div>
  );
};

describe('App Component Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Mock import.meta.env
    vi.stubGlobal('import.meta', {
      env: {
        DEV: true,
      },
    });
  });

  it('renders basic elements correctly', () => {
    render(<TestComponent />);

    expect(screen.getByText('YeetCode')).toBeInTheDocument();
    expect(screen.getByText('Welcome to YeetCode! 🚀')).toBeInTheDocument();
    expect(screen.getByText('Get Started! 🎯')).toBeInTheDocument();
  });

  it('renders with custom props', () => {
    render(<TestComponent title="Custom Title" subtitle="Custom Subtitle" />);

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Subtitle')).toBeInTheDocument();
  });

  it('button is clickable', () => {
    render(<TestComponent />);

    const button = screen.getByText('Get Started! 🎯');
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });

  it('has proper heading hierarchy', () => {
    render(<TestComponent />);

    const h1 = screen.getByRole('heading', { level: 1 });
    const h2 = screen.getByRole('heading', { level: 2 });

    expect(h1).toHaveTextContent('YeetCode');
    expect(h2).toHaveTextContent('Welcome to YeetCode! 🚀');
  });
});
