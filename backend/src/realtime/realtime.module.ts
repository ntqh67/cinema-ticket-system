import { Module } from '@nestjs/common';
import { SeatEventsGateway } from './seat-events.gateway';

// Module thời gian thực: hiện chỉ có kênh cập nhật sơ đồ ghế theo suất chiếu.
@Module({ providers: [SeatEventsGateway], exports: [SeatEventsGateway] })
export class RealtimeModule {}
