/**
 * Mục đích: Kiểm thử gateway Socket.IO với kết nối thật: chỉ client trong room
 * của suất chiếu mới nhận sự kiện seats:changed.
 */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'net';
import { io, type Socket } from 'socket.io-client';
import { RealtimeModule } from '../src/realtime/realtime.module';
import {
  SEATS_CHANGED_EVENT,
  SeatEventsGateway,
} from '../src/realtime/seat-events.gateway';

describe('SeatEventsGateway (Socket.IO)', () => {
  let app: INestApplication;
  let gateway: SeatEventsGateway;
  let url: string;
  const clients: Socket[] = [];

  const connect = async (): Promise<Socket> => {
    const client = io(`${url}/seats`, { transports: ['websocket'] });
    clients.push(client);
    await new Promise<void>((resolve) => client.on('connect', resolve));
    return client;
  };
  const join = (client: Socket, showtimeId: unknown) =>
    client.emitWithAck('showtime:join', showtimeId) as Promise<{
      joined: boolean;
    }>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RealtimeModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    gateway = moduleRef.get(SeatEventsGateway);
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    clients.forEach((client) => client.close());
    await app.close();
  });

  it('chỉ gửi sự kiện cho client đã tham gia đúng suất chiếu', async () => {
    const watcher = await connect();
    const other = await connect();
    expect(await join(watcher, 'showtime-1')).toEqual({ joined: true });
    expect(await join(other, 'showtime-2')).toEqual({ joined: true });

    const received: unknown[] = [];
    const missed: unknown[] = [];
    watcher.on(SEATS_CHANGED_EVENT, (payload) => received.push(payload));
    other.on(SEATS_CHANGED_EVENT, (payload) => missed.push(payload));

    gateway.publishSeatsChanged('showtime-1');
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(received).toEqual([{ showtimeId: 'showtime-1' }]);
    expect(missed).toEqual([]);
  });

  it('từ chối id suất chiếu không hợp lệ', async () => {
    const client = await connect();
    expect(await join(client, '')).toEqual({ joined: false });
    expect(await join(client, 'x'.repeat(65))).toEqual({ joined: false });
    expect(await join(client, { $ne: 1 })).toEqual({ joined: false });
  });
});
