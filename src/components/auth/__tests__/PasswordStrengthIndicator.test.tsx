import { render, screen } from '@testing-library/react';
import { PasswordStrengthIndicator } from '../PasswordStrengthIndicator';

describe('PasswordStrengthIndicator', () => {
  it('renders nothing when password is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders "약" in red for very weak password (score 0)', () => {
    render(<PasswordStrengthIndicator password="a" />);
    const indicator = screen.getByText(/암호 강도:/);
    expect(indicator).toBeInTheDocument();

    const strengthText = screen.getByText('매우 약함');
    expect(strengthText).toBeInTheDocument();
    expect(strengthText).toHaveClass('text-red-600');
  });

  it('renders "약" in red for weak password (score 1)', () => {
    render(<PasswordStrengthIndicator password="abc123" />);
    const strengthText = screen.getByText('약함');
    expect(strengthText).toBeInTheDocument();
    expect(strengthText).toHaveClass('text-red-500');
  });

  it('renders "강" in green for strong password (score 3)', () => {
    render(<PasswordStrengthIndicator password="abc123ABC" />);
    const strengthText = screen.getByText('강함');
    expect(strengthText).toBeInTheDocument();
    expect(strengthText).toHaveClass('text-green-500');
  });

  it('renders "매우 강" in green for very strong password (score 4)', () => {
    render(<PasswordStrengthIndicator password="abc123ABC!@#" />);
    const strengthText = screen.getByText('매우 강함');
    expect(strengthText).toBeInTheDocument();
    expect(strengthText).toHaveClass('text-green-600');
  });

  it('renders strength bar with correct width based on score', () => {
    const { container } = render(<PasswordStrengthIndicator password="abc123ABC" />);
    const strengthBar = container.querySelector('[data-testid="strength-bar"]');
    expect(strengthBar).toHaveStyle({ width: '80%' });
  });
});
