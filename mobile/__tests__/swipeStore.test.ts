import { useSwipeStore } from '../src/store/useSwipeStore';
import { apartmentsApi, swipeApi } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  apartmentsApi: {
    getFeed: jest.fn(),
  },
  swipeApi: {
    quota: jest.fn(),
    record: jest.fn(),
    undo: jest.fn(),
  },
}));

const apartment = { id: 'a1', title: 'Apt', city: 'Tel Aviv' } as any;

describe('useSwipeStore', () => {
  beforeEach(() => {
    useSwipeStore.setState({
      deck: [],
      currentIndex: 0,
      isLoading: false,
      hasMore: true,
      lastMatch: null,
      lastSwipedApartment: null,
      dailyUsed: 0,
      dailyLimit: 20,
      quotaExceeded: false,
    });
    jest.clearAllMocks();
  });

  it('loads feed into deck', async () => {
    (apartmentsApi.getFeed as jest.Mock).mockResolvedValue({
      data: { apartments: [apartment], totalPages: 1 },
    });

    await useSwipeStore.getState().loadFeed({ city: 'Tel Aviv' });

    expect(useSwipeStore.getState().deck).toHaveLength(1);
    expect(useSwipeStore.getState().isLoading).toBe(false);
  });

  it('sets quotaExceeded when API responds with 429', async () => {
    useSwipeStore.setState({ deck: [apartment], currentIndex: 0, hasMore: false });
    (swipeApi.record as jest.Mock).mockRejectedValue({ response: { status: 429 } });

    await useSwipeStore.getState().swipe(apartment, 'like');

    expect(useSwipeStore.getState().quotaExceeded).toBe(true);
    expect(useSwipeStore.getState().currentIndex).toBe(0);
  });
});
