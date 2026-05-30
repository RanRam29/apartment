describe('Socket chat room authorization', () => {
  let mockIo;
  let mockMatch;

  function loadSocketConfig() {
    jest.resetModules();
    process.env.JWT_SECRET = 'test_jwt_secret_for_socket_tests';

    mockMatch = {
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    mockIo = {
      use: jest.fn(function use(fn) {
        this.middleware = fn;
      }),
      on: jest.fn(function on(event, handler) {
        if (event === 'connection') this.connectionHandler = handler;
      }),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };

    jest.doMock('socket.io', () => ({
      Server: jest.fn(() => mockIo),
    }));
    jest.doMock('jsonwebtoken', () => ({
      verify: jest.fn(() => ({ id: 'tenant-1', role: 'tenant' })),
    }));
    jest.doMock('../src/models', () => ({
      Match: mockMatch,
      Message: { create: jest.fn() },
    }));
    jest.doMock('../src/services/systemEventService', () => ({
      logSystemEvent: jest.fn(),
    }));
    jest.doMock('../src/services/auditLogService', () => ({
      logAudit: jest.fn(),
    }));
    jest.doMock('../src/utils/logger', () => ({
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));

    const socketConfig = require('../src/config/socket');
    socketConfig.initSocket({});
  }

  function connectSocket(user = { id: 'tenant-1', role: 'tenant' }) {
    const handlers = {};
    const rooms = new Set(['socket-1']);
    const socket = {
      user,
      id: 'socket-1',
      conn: { transport: { name: 'websocket' } },
      rooms,
      join: jest.fn((room) => rooms.add(room)),
      leave: jest.fn((room) => rooms.delete(room)),
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };

    mockIo.connectionHandler(socket);
    return { handlers, rooms, socket };
  }

  async function flushAutoJoin() {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('rejects joining a chat room for a match the socket user does not belong to', async () => {
    loadSocketConfig();
    mockMatch.findOne.mockResolvedValue({
      id: 'match-1',
      tenantId: 'other-tenant',
      landlordId: 'landlord-1',
    });

    const { handlers, socket } = connectSocket();
    await flushAutoJoin();
    socket.join.mockClear();

    const ack = jest.fn();
    await handlers.join_chat('match-1', ack);

    expect(socket.join).not.toHaveBeenCalledWith('chat:match-1');
    expect(ack).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('allows joining an accepted match chat room for a participant', async () => {
    loadSocketConfig();
    mockMatch.findOne.mockResolvedValue({
      id: 'match-1',
      tenantId: 'tenant-1',
      landlordId: 'landlord-1',
    });

    const { handlers, rooms, socket } = connectSocket();
    await flushAutoJoin();
    socket.join.mockClear();

    const ack = jest.fn();
    await handlers.join_chat('match-1', ack);

    expect(socket.join).toHaveBeenCalledWith('chat:match-1');
    expect(rooms.has('chat:match-1')).toBe(true);
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('only emits typing indicators to rooms the socket has joined', () => {
    loadSocketConfig();
    const { handlers, rooms, socket } = connectSocket();

    handlers.typing({ matchId: 'match-1' });
    expect(socket.to).not.toHaveBeenCalled();

    rooms.add('chat:match-1');
    handlers.typing({ matchId: 'match-1' });

    expect(socket.to).toHaveBeenCalledWith('chat:match-1');
  });
});
