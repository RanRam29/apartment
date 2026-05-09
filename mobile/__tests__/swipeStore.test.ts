import { useSwipeStore } from '../src/store/useSwipeStore';
import { apartmentsApi, swipeApi } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  apartmentsApi: { getFeed: jest.fn() },
  swipeApi: { quota: jest.fn(), record: jest.fn(), undo: jest.fn() },
}));

const apartment = { id: 'a1', title: 'Apt', city: 'Tel Aviv' } as any;
const reset = () => useSwipeStore.setState({
  deck: [], currentIndex: 0, isLoading: false, hasMore: true,
  lastMatch: null, lastSwipedApartment: null,
  dailyUsed: 0, dailyLimit: 20, quotaExceeded: false,
});

describe('useSwipeStore', () => {
  beforeEach(() => { reset(); jest.clearAllMocks(); });

  it('loads feed into deck', async () => {
    (apartmentsApi.getFeed as jest.Mock).mockResolvedValue({
      data: { apartments: [apartment], totalPages: 1 },
    });
    await useSwipeStore.getState().loadFeed({ city: 'Tel Aviv' });
    expect(useSwipeStore.getState().deck).toHaveLength(1);
    expect(useSwipeStore.getState().isLoading).toBe(false);
  });

  it('loadQuota updates daily usage counts', async () => {
    (swipeApi.quota as jest.Mock).mockResolvedValue({ data: { used: 5, limit: 20, isPremium: false } });
    await useSwipeStore.getState().loadQuota();
    expect(useSwipeStore.getState().dailyUsed).toBe(5);
    expect(useSwipeStore.getState().quotaExceeded).toBe(false);
  });

  it('loadQuota marks quota exceeded when limit reached', async () => {
    (swipeApi.quota as jest.Mock).mockResolvedValue({ data: { used: 20, limit: 20, isPremium: false } });
    await useSwipeStore.getState().loadQuota();
    expect(useSwipeStore.getState().quotaExceeded).toBe(true);
  });

  it('swipe advances index and records match when returned', async () => {
    const match = { id: 'm1' };
    (swipeApi.record as jest.Mock).mockResolvedValue({
      data: { match, dailyUsed: 1, dailyLimit: 20 },
    });
    useSwipeStore.setState({ deck: [apartment], currentIndex: 0, hasMore: false });
    await useSwipeStore.getState().swipe(apartment, 'like');
    expect(useSwipeStore.getState().currentIndex).toBe(1);
    expect(useSwipeStore.getState().lastMatch).toEqual(match);
    expect(useSwipeStore.getState().dailyUsed).toBe(1);
  });

  it('swipe increments dailyUsed locally when API returns null', async () => {
    (swipeApi.record as jest.Mock).mockResolvedValue({
      data: { match: null, dailyUsed: null, dailyLimit: null },
    });
    useSwipeStore.setState({ deck: [apartment], currentIndex: 0, hasMore: false, dailyUsed: 3 });
    await useSwipeStore.getState().swipe(apartment, 'dislike');
    expect(useSwipeStore.getState().dailyUsed).toBe(4);
  });

  it('sets quotaExceeded when API responds with 429', async () => {
    useSwipeStore.setState({ deck: [apartment], currentIndex: 0, hasMore: false });
    (swipeApi.record as jest.Mock).mockRejectedValue({ response: { status: 429 } });
    await useSwipeStore.getState().swipe(apartment, 'like');
    expect(useSwipeStore.getState().quotaExceeded).toBe(true);
    expect(useSwipeStore.getState().currentIndex).toBe(0);
  });

  it('undo reverses swipe and decrements dailyUsed', async () => {
    (swipeApi.undo as jest.Mock).mockResolvedValue({});
    useSwipeStore.setState({ deck: [apartment], currentIndex: 1, lastSwipedApartment: apartment, dailyUsed: 5, hasMore: false });
    await useSwipeStore.getState().undo();
    expect(useSwipeStore.getState().currentIndex).toBe(0);
    expect(useSwipeStore.getState().dailyUsed).toBe(4);
    expect(useSwipeStore.getState().lastSwipedApartment).toBeNull();
  });

  it('undo is a no-op when nothing has been swiped', async () => {
    await useSwipeStore.getState().undo();
    expect(swipeApi.undo).not.toHaveBeenCalled();
  });

  it('resetMatch clears lastMatch', () => {
    useSwipeStore.setState({ ...useSwipeStore.getState(), lastMatch: { id: 'm1' } as any });
    useSwipeStore.getState().resetMatch();
    expect(useSwipeStore.getState().lastMatch).toBeNull();
  });

  it('dismissQuota clears quotaExceeded', () => {
    useSwipeStore.setState({ ...useSwipeStore.getState(), quotaExceeded: true });
    useSwipeStore.getState().dismissQuota();
    expect(useSwipeStore.getState().quotaExceeded).toBe(false);
  });
});
