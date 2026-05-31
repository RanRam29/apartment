import { useChatStore } from '../src/store/useChatStore';
import { chatApi, clientLogsApi, tokenStorage } from '../src/services/api';

const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    connected: true,
    emit: mockEmit,
    on: mockOn,
    disconnect: mockDisconnect,
  })),
}));

jest.mock('../src/services/api', () => ({
  chatApi: {
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
  },
  clientLogsApi: {
    event: jest.fn(async () => undefined),
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
    expect(mockOn).toHaveBeenCalled();
  });

  it('connect does nothing without token', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValue(null);
    await useChatStore.getState().connect();
    expect(useChatStore.getState().socket).toBeNull();
  });

  it('disconnect clears socket and messages', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValue('tok');
    await useChatStore.getState().connect();
    useChatStore.setState({ messages: { 'm1': [] } });
    useChatStore.getState().disconnect();
    expect(useChatStore.getState().socket).toBeNull();
    expect(useChatStore.getState().messages).toEqual({});
    expect(clientLogsApi.event).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'client.socket.disconnect' })
    );
  });

  it('joinChat emits join_chat event on connected socket', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValue('tok');
    await useChatStore.getState().connect();
    useChatStore.getState().joinChat('match-1');
    expect(mockEmit).toHaveBeenCalledWith('join_chat', 'match-1');
  });

  it('loadMessages stores messages for matchId', async () => {
    const msgs = [{ id: 'msg-1', content: 'hi', matchId: 'm1' }];
    (chatApi.getMessages as jest.Mock).mockResolvedValue({ data: { messages: msgs } });
    await useChatStore.getState().loadMessages('m1');
    expect(useChatStore.getState().messages['m1']).toHaveLength(1);
  });

  it('loadMessages prepends older messages when before is provided', async () => {
    const existing = [{ id: 'msg-2', content: 'newer' }];
    const older    = [{ id: 'msg-1', content: 'older' }];
    useChatStore.setState({ messages: { 'm1': existing as any }, socket: null, typingUsers: {} });
    (chatApi.getMessages as jest.Mock).mockResolvedValue({ data: { messages: older } });
    await useChatStore.getState().loadMessages('m1', 'msg-2');
    expect(useChatStore.getState().messages['m1'][0].id).toBe('msg-1');
    expect(useChatStore.getState().messages['m1'][1].id).toBe('msg-2');
  });

  it('sendMessage uses socket when connected', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValue('tok');
    await useChatStore.getState().connect();
    await useChatStore.getState().sendMessage('m1', 'hello via socket');
    expect(mockEmit).toHaveBeenCalledWith('send_message', { matchId: 'm1', content: 'hello via socket' });
    expect(chatApi.sendMessage).not.toHaveBeenCalled();
  });

  it('sendMessage falls back to REST without connected socket', async () => {
    (chatApi.sendMessage as jest.Mock).mockResolvedValue({ data: {} });
    useChatStore.setState({ socket: null });
    await useChatStore.getState().sendMessage('m1', 'hello');
    expect(chatApi.sendMessage).toHaveBeenCalledWith('m1', 'hello');
  });

  it('setTyping emits typing event on socket', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValue('tok');
    await useChatStore.getState().connect();
    useChatStore.getState().setTyping('m1', true);
    expect(mockEmit).toHaveBeenCalledWith('typing', { matchId: 'm1' });
  });

  it('setTyping emits stop_typing event on socket', async () => {
    (tokenStorage.get as jest.Mock).mockResolvedValue('tok');
    await useChatStore.getState().connect();
    useChatStore.getState().setTyping('m1', false);
    expect(mockEmit).toHaveBeenCalledWith('stop_typing', { matchId: 'm1' });
  });
});
