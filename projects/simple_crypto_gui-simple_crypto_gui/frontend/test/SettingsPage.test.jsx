import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '../src/pages/SettingsPage';

// Mock dependencies
jest.mock('../src/utils/store', () => ({
  useStore: jest.fn().mockReturnValue({
    mnemonic: 'test mnemonic',
    selectedAddress: '0x123',
    setSelectedAddress: jest.fn()
  })
}));

jest.mock('../src/components/BlockchainSettingsModal', () => ({
  __esModule: true,
  default: function MockBlockchainSettingsModal(props) {
    return <div data-testid="blockchain-modal">Blockchain Settings Modal</div>;
  }
}));

describe('SettingsPage', () => {
  test('should render SettingsPage correctly', () => {
    const { container } = render(<SettingsPage />);
    expect(container).toBeInTheDocument();
  });

  test('should render blockchain settings modal', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('blockchain-modal')).toBeInTheDocument();
  });
});