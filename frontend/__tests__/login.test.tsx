import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/(auth)/login/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/api', () => ({
  default: { post: jest.fn() },
}));

describe('Login Page', () => {
  it('renders email input', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('alice@finance.demo')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
  });
});
