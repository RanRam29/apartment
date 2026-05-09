import React from 'react';
import { Alert, Switch } from 'react-native';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RoommateScreen from '../src/screens/RoommateScreen';
import { roommateApi } from '../src/services/api';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name),
  };
});

jest.mock('../src/services/api', () => ({
  roommateApi: {
    getProfile: jest.fn(),
    saveProfile: jest.fn(),
    getMatches: jest.fn(),
  },
}));

const savedProfile = {
  userId: 'user-1',
  lookingForRoommate: true,
  sleepSchedule: 'night_owl',
  cleanlinessLevel: 5,
  noiseLevel: 'lively',
  guestsFrequency: 'often',
  smokingAllowed: true,
  petsAllowed: true,
  workFromHome: true,
  cities: ['Tel Aviv'],
  firstName: 'Saved',
  lastName: 'Tenant',
  avatarUrl: null,
};

let queryClient: QueryClient | null = null;

function renderWithClient() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });

  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(RoommateScreen)
    )
  );
}

describe('RoommateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (roommateApi.getProfile as jest.Mock).mockResolvedValue({ data: { profile: savedProfile } });
    (roommateApi.saveProfile as jest.Mock).mockResolvedValue({ data: { profile: savedProfile } });
    (roommateApi.getMatches as jest.Mock).mockResolvedValue({ data: { matches: [] } });
  });

  afterEach(() => {
    cleanup();
    queryClient?.clear();
    queryClient = null;
    jest.restoreAllMocks();
  });

  it('saves the hydrated server profile instead of overwriting it with defaults', async () => {
    const screen = renderWithClient();

    const saveButton = await screen.findByText('שמור פרופיל');
    await waitFor(() => {
      expect(screen.UNSAFE_getAllByType(Switch).every((node) => node.props.value === true)).toBe(true);
    });

    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(roommateApi.saveProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          lookingForRoommate: true,
          sleepSchedule: 'night_owl',
          cleanlinessLevel: 5,
          noiseLevel: 'lively',
          guestsFrequency: 'often',
          smokingAllowed: true,
          petsAllowed: true,
          workFromHome: true,
          cities: ['Tel Aviv'],
        })
      );
    });
  });
});
