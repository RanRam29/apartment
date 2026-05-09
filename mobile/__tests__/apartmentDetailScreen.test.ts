import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApartmentDetailScreen from '../src/screens/ApartmentDetailScreen';
import { apartmentsApi } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  apartmentsApi: {
    getById: jest.fn(),
  },
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => React.createElement(Text, null, name),
}));

const apartment = {
  id: 'apt-1',
  landlordId: 'landlord-1',
  title: 'Test apartment',
  description: null,
  price: 7000,
  rooms: 3,
  floor: null,
  totalFloors: null,
  sizeSqm: 90,
  city: 'תל אביב',
  neighborhood: null,
  address: null,
  latitude: null,
  longitude: null,
  images: [],
  amenities: [],
  availableFrom: null,
  minLeasePeriod: null,
  petsAllowed: false,
  isActive: true,
  viewCount: 0,
  likeCount: 0,
  createdAt: '2026-05-09T00:00:00.000Z',
  costBreakdown: {
    rent: 7000,
    arnonaEstimate: 720,
    buildingFeeEstimate: 250,
    total: 7970,
    note: 'ארנונה ודמי ועד בית הינם הערכה בלבד',
  },
};

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(ApartmentDetailScreen, {
        route: { params: { apartmentId: apartment.id } },
        navigation: { goBack: jest.fn() },
      } as any)
    )
  );
}

describe('ApartmentDetailScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders apartment details after the loading state', async () => {
    (apartmentsApi.getById as jest.Mock).mockResolvedValueOnce({ data: { apartment } });

    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Test apartment')).toBeTruthy();
    });
    expect(screen.getByText('עלות חודשית משוערת')).toBeTruthy();
  });
});
