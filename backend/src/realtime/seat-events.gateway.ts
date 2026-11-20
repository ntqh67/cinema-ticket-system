/**
 * Mục đích: Phát sự kiện thời gian thực khi sơ đồ ghế của một suất chiếu thay đổi.
 * Chỉ gửi showtimeId (không gửi dữ liệu ghế hay chủ giữ); client tải lại sơ đồ ghế
 * qua API để heldByMe vẫn được tính riêng cho từng người.
 */
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { corsOriginCallback } from '../common/cors-origin';

// Độ dài tối đa của id suất chiếu được chấp nhận khi tham gia room.
const MAX_SHOWTIME_ID_LENGTH = 64;
export const SEATS_CHANGED_EVENT = 'seats:changed';

// Tên room theo suất chiếu, dùng chung cho join/leave và phát sự kiện.
export const showtimeRoom = (showtimeId: string) => `showtime:${showtimeId}`;

@WebSocketGateway({ namespace: 'seats', cors: { origin: corsOriginCallback } })
export class SeatEventsGateway {
  @WebSocketServer()
  private server?: Server;

  // Client xem sơ đồ ghế tham gia room của suất chiếu đó.
  @SubscribeMessage('showtime:join')
  join(
    @ConnectedSocket() client: Socket,
    @MessageBody() showtimeId: unknown,
  ): { joined: boolean } {
    if (!this.isValidShowtimeId(showtimeId)) return { joined: false };
    void client.join(showtimeRoom(showtimeId));
    return { joined: true };
  }

  @SubscribeMessage('showtime:leave')
  leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() showtimeId: unknown,
  ): { left: boolean } {
    if (!this.isValidShowtimeId(showtimeId)) return { left: false };
    void client.leave(showtimeRoom(showtimeId));
    return { left: true };
  }

  // Báo cho mọi client trong room rằng sơ đồ ghế đã đổi; lỗi phát không được làm hỏng nghiệp vụ.
  publishSeatsChanged(showtimeId: string): void {
    this.server?.to(showtimeRoom(showtimeId)).emit(SEATS_CHANGED_EVENT, {
      showtimeId,
    });
  }

  private isValidShowtimeId(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      value.length > 0 &&
      value.length <= MAX_SHOWTIME_ID_LENGTH
    );
  }
}
