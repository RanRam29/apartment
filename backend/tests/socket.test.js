process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_socket_suite';

const mockIoUse = jest.fn();
const mockIoTo = jest.fn();
let mockConnectionHandler;
const mockIoOn = jest.fn((event, handler) => {
  if (event === 'connection') mockConnectionHandler = handler;
});
const mockIo = { use: mockIoUse, on: mockIoOn, to: mockIoTo };

jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockIo),
}));

const mockMatchFindOne = jest.fn();
const mockMatchFindAll = jest.fn();

jest.mock('../src/models', () => ({
  Match: {
    findOne: mockMatchFindOne,
    findAll: mockMatchFindAll,
  },
}));

jest.mock('../src/services/systemEventService', () => ({
  logSystemEvent: jest.fn(),
}));

jest.mock('../src/services/auditLogService', () => ({
  logAudit: jest.fn(),
}));

const { initSocket } = require('../src/config/socket');

function connectTestSocket(user = { id: 'tenant-1', role: 'tenant' }) {
  const handlers = {};
  const socket = {
    id: 'socket-1',
    user,
    conn: { transport: { name: 'polling' } },
    join: jest.fn(),
    leave: jest.fn(),
    on: jest.fn((event, handler) => {
      handlers[event] = handler;
    }),
  };

  mockConnectionHandler(socket);
  return { socket, handlers };
}

describe('Socket chat authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectionHandler = undefined;
    mockMatchFindAll.mockResolvedValue([]);
    initSocket({});
  });

  it('allows accepted match participants to join their chat room', async () => {
    const { socket, handlers } = connectTestSocket();
    mockMatchFindOne.mockResolvedValue({
      id: 'match-1',
      tenantId: 'tenant-1',
      landlordId: 'landlord-1',
    });
    const ack = jest.fn();

    await handlers.join_chat('match-1', ack);

    expect(mockMatchFindOne).toHaveBeenCalledWith({
      where: { id: 'match-1', status: 'accepted' },
      attributes: ['id', 'tenantId', 'landlordId'],
    });
    expect(socket.join).toHaveBeenCalledWith('chat:match-1');
    expect(ack).toHaveBeenCalledWith({ success: true });
  });

  it('does not let outsiders subscribe to another match chat room', async () => {
    const { socket, handlers } = connectTestSocket();
    mockMatchFindOne.mockResolvedValue({
      id: 'match-1',
      tenantId: 'tenant-2',
      landlordId: 'landlord-1',
    });
    const ack = jest.fn();

    await handlers.join_chat('match-1', ack);

    expect(socket.join).not.toHaveBeenCalledWith('chat:match-1');
    expect(ack).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });
});
