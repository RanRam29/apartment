import { useChatStore } from '../src/store/useChatStore';
import { chatApi, tokenStorage } from '../src/services/api';

const emit = jest.fn();
const on = jest.fn();
const disconnect = jest.fn();

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connected: true,
    emit,
    on,
    disconnect,
  })),
}));

jest.mock('../src/services/api', () => ({
  chatApi: {
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
  },
  tokenStorage: {
    get: jest.fn(),
  },
}));

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({ messages: {}, socket: null, typingUsers: {} });
    jest.clearAllMocks();
  });

  it('connect creates socket when token exists', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValue('token-1');

    await useChatStore.getState().connect();

    expect(useChatStore.getState().socket).toBeTruthy();
    expect(on).toHaveBeenCalled();
  });

  it('sendMessage falls back to REST without connected socket', async () => {
    (chatApi.sendMessage as jest.Mock).mockResolvedValue({ data: {} });
    useChatStore.setState({ socket: null });

    await useChatStore.getState().sendMessage('m1', 'hello');

    expect(chatApi.sendMessage).toHaveBeenCalledWith('m1', 'hello');
  });
});
