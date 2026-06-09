import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Landing Page', () => {
  it('renders logo', () => {
    render(<LandingPage />);
    expect(screen.getByText(/FinanceTracker/i)).toBeInTheDocument();
  });

  it('renders login button', () => {
    render(<LandingPage />);
    expect(screen.getByText('Войти')).toBeInTheDocument();
  });
});
