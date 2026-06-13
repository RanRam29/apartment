process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_socket_tests';

const jwt = require('jsonwebtoken');

let mockIo;
const mockMatch = {
  findAll: jest.fn(),
  findOne: jest.fn(),
};
const mockUser = {
  findByPk: jest.fn(),
};

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => {
    mockIo = {
      middleware: null,
      handlers: {},
      use: jest.fn((handler) => {
        mockIo.middleware = handler;
      }),
      on: jest.fn((event, handler) => {
        mockIo.handlers[event] = handler;
      }),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };
    return mockIo;
  }),
}));

jest.mock('../src/models', () => ({
  Match: mockMatch,
  User: mockUser,
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

const { initSocket } = require('../src/config/socket');

function makeSocket(userId = 'user-1') {
  const handlers = {};
  const emit = jest.fn();
  const socket = {
    id: 'socket-1',
    handshake: {
      auth: {
        token: jwt.sign({ id: userId, role: 'tenant' }, process.env.JWT_SECRET),
      },
    },
    conn: { transport: { name: 'polling' } },
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    on: jest.fn((event, handler) => {
      handlers[event] = handler;
    }),
    to: jest.fn(() => ({ emit })),
    handlers,
    emittedToRoom: emit,
  };
  return socket;
}

async function connectSocket(socket) {
  initSocket({});
  await new Promise((resolve, reject) => {
    mockIo.middleware(socket, (err) => (err ? reject(err) : resolve()));
  });
  mockIo.handlers.connection(socket);
}

describe('Socket chat room authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatch.findAll.mockResolvedValue([]);
    mockMatch.findOne.mockResolvedValue(null);
    mockUser.findByPk.mockImplementation((id) =>
      Promise.resolve({
        id,
        role: 'tenant',
        email: `${id}@test.com`,
        isPremium: false,
        isVerified: true,
      })
    );
  });

  it('joins a chat room when the user is an accepted match participant', async () => {
    mockMatch.findOne.mockResolvedValue({ id: 'match-1', tenantId: 'user-1', landlordId: 'user-2' });
    const socket = makeSocket('user-1');
    await connectSocket(socket);

    const ack = jest.fn();
    await socket.handlers.join_chat('match-1', ack);

    expect(socket.join).toHaveBeenCalledWith('chat:match-1');
    expect(socket.data.authorizedChatRooms.has('match-1')).toBe(true);
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('rejects chat room joins for authenticated non-participants', async () => {
    const socket = makeSocket('outsider');
    await connectSocket(socket);

    const ack = jest.fn();
    await socket.handlers.join_chat('match-1', ack);

    expect(socket.join).not.toHaveBeenCalledWith('chat:match-1');
    expect(socket.data.authorizedChatRooms.has('match-1')).toBe(false);
    expect(ack).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('does not broadcast typing indicators into unauthorized chat rooms', async () => {
    const socket = makeSocket('outsider');
    await connectSocket(socket);

    await socket.handlers.typing({ matchId: 'match-1' });

    expect(socket.to).not.toHaveBeenCalledWith('chat:match-1');
    expect(socket.emittedToRoom).not.toHaveBeenCalled();
  });
});
