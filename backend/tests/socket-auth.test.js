process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_socket_secret';

let mockAuthMiddleware;
let mockConnectionHandler;

const mockServerInstance = {
  use: jest.fn((handler) => {
    mockAuthMiddleware = handler;
  }),
  on: jest.fn((event, handler) => {
    if (event === 'connection') {
      mockConnectionHandler = handler;
    }
  }),
};

const mockMatch = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockMessage = {
  create: jest.fn(),
};

jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockServerInstance),
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../src/models', () => ({
  Match: mockMatch,
  Message: mockMessage,
}));

jest.mock('../src/utils/logger', () => ({
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../src/services/systemEventService', () => ({
  logSystemEvent: jest.fn(),
}));

jest.mock('../src/services/auditLogService', () => ({
  logAudit: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const { initSocket } = require('../src/config/socket');

function createSocket(user) {
  const handlers = {};
  const rooms = new Set();
  const emit = jest.fn();

  return {
    id: `socket-${user.id}`,
    user,
    conn: { transport: { name: 'websocket' } },
    rooms,
    join: jest.fn((room) => rooms.add(room)),
    leave: jest.fn((room) => rooms.delete(room)),
    on: jest.fn((event, handler) => {
      handlers[event] = handler;
    }),
    to: jest.fn(() => ({ emit })),
    handlers,
    emit,
  };
}

async function connectSocket(user) {
  mockMatch.findAll.mockResolvedValue([]);
  initSocket({});

  const socket = createSocket(user);
  mockConnectionHandler(socket);

  await Promise.resolve();
  socket.join.mockClear();
  return socket;
}

describe('Socket chat room authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthMiddleware = undefined;
    mockConnectionHandler = undefined;
  });

  it('accepts valid JWTs before connection handlers run', () => {
    jwt.verify.mockReturnValue({ id: 'tenant-1', role: 'tenant' });
    initSocket({});

    const socket = { handshake: { auth: { token: 'token' } } };
    const next = jest.fn();
    mockAuthMiddleware(socket, next);

    expect(jwt.verify).toHaveBeenCalledWith('token', process.env.JWT_SECRET);
    expect(socket.user).toEqual({ id: 'tenant-1', role: 'tenant' });
    expect(next).toHaveBeenCalledWith();
  });

  it('does not let outsiders join another match chat room', async () => {
    const socket = await connectSocket({ id: 'outsider-1', role: 'tenant' });
    const ack = jest.fn();

    mockMatch.findOne.mockResolvedValue({
      id: 'match-1',
      tenantId: 'tenant-1',
      landlordId: 'landlord-1',
    });

    await socket.handlers.join_chat('match-1', ack);

    expect(mockMatch.findOne).toHaveBeenCalledWith({
      where: { id: 'match-1', status: 'accepted' },
      attributes: ['id', 'tenantId', 'landlordId'],
    });
    expect(socket.join).not.toHaveBeenCalledWith('chat:match-1');
    expect(socket.rooms.has('chat:match-1')).toBe(false);
    expect(ack).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('lets accepted match participants join their chat room', async () => {
    const socket = await connectSocket({ id: 'tenant-1', role: 'tenant' });
    const ack = jest.fn();

    mockMatch.findOne.mockResolvedValue({
      id: 'match-1',
      tenantId: 'tenant-1',
      landlordId: 'landlord-1',
    });

    await socket.handlers.join_chat('match-1', ack);

    expect(socket.join).toHaveBeenCalledWith('chat:match-1');
    expect(socket.rooms.has('chat:match-1')).toBe(true);
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('does not broadcast typing events unless the socket is in the chat room', async () => {
    const socket = await connectSocket({ id: 'outsider-1', role: 'tenant' });

    socket.handlers.typing({ matchId: 'match-1' });
    socket.handlers.stop_typing({ matchId: 'match-1' });

    expect(socket.to).not.toHaveBeenCalled();
  });
});
