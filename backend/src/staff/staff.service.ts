import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { formatDateInDaNang } from '../common/danang-date';
import { PrismaService } from '../prisma/prisma.service';
import { calculateStaffPay } from '../common/staff-pay';
import {
  resolveStaffAttendanceStatus,
  STAFF_SHIFTS,
  StaffShiftCode,
} from '../common/staff-shifts';

type AttendanceRow = {
  id: string;
  workDate: Date;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  shiftCode: string | null;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'LEAVE';
  note: string | null;
};

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async getAttendance(staffId: string, month?: string) {
    const selectedMonth = month || formatDateInDaNang(new Date()).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(selectedMonth)) {
      throw new BadRequestException('Tháng không hợp lệ');
    }
    const [year, monthNumber] = selectedMonth.split('-').map(Number);
    if (monthNumber < 1 || monthNumber > 12) {
      throw new BadRequestException('Tháng không hợp lệ');
    }
    const nextMonth = `${monthNumber === 12 ? year + 1 : year}-${String((monthNumber % 12) + 1).padStart(2, '0')}-01`;
    const monthStart = `${selectedMonth}-01`;
    const attendances = await this.prisma.$queryRaw<AttendanceRow[]>(
      Prisma.sql`SELECT "id", "workDate", "checkInAt", "checkOutAt", "shiftCode", "status", "note"
                 FROM "staff_attendances"
                 WHERE "staffId" = ${staffId}
                   AND "workDate" >= ${monthStart}::date
                   AND "workDate" < ${nextMonth}::date
                 ORDER BY "workDate" ASC`,
    );
    const today = formatDateInDaNang(new Date());
    const activeAttendance = await this.findOpenAttendance(staffId, today);
    const attendanceData = attendances.map((item) => {
      const workDate = formatDateInDaNang(item.workDate);
      return {
        ...item,
        workDate,
        status: resolveStaffAttendanceStatus(
          workDate,
          item.checkInAt,
          item.shiftCode,
          item.status,
        ),
        pay: calculateStaffPay(item.checkInAt, item.checkOutAt),
      };
    });
    return {
      month: selectedMonth,
      today,
      shifts: Object.entries(STAFF_SHIFTS).map(([code, shift]) => ({ code, ...shift })),
      activeAttendance: activeAttendance
        ? {
            ...activeAttendance,
            workDate: formatDateInDaNang(activeAttendance.workDate),
            pay: calculateStaffPay(activeAttendance.checkInAt, activeAttendance.checkOutAt),
          }
        : null,
      todayAttendance: attendanceData.find(item => item.workDate === today) || null,
      monthSalary: attendanceData.reduce((sum, item) => sum + item.pay.salary, 0),
      attendances: attendanceData,
    };
  }

  async checkIn(staffId: string, shiftCode: StaffShiftCode) {
    const now = new Date();
    const today = formatDateInDaNang(now);
    const shift = STAFF_SHIFTS[shiftCode];
    if (!shift) throw new BadRequestException('Ca làm việc không hợp lệ');
    const current = await this.findAttendance(staffId, today);
    if (current?.checkInAt) throw new ConflictException('Bạn đã vào ca hôm nay');

    const [startHour, startMinute] = shift.start.split(':').map(Number);
    const lateMinuteTotal = startHour * 60 + startMinute + 15;
    const lateHour = Math.floor(lateMinuteTotal / 60) % 24;
    const lateMinute = lateMinuteTotal % 60;
    const lateAfter = new Date(
      `${today}T${String(lateHour).padStart(2, '0')}:${String(lateMinute).padStart(2, '0')}:00.000+07:00`,
    );
    const status = now > lateAfter ? 'LATE' : 'PRESENT';
    const rows = await this.prisma.$queryRaw<AttendanceRow[]>(
      Prisma.sql`INSERT INTO "staff_attendances"
        ("id", "staffId", "workDate", "checkInAt", "shiftCode", "status", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${staffId}, ${today}::date, ${now}, ${shiftCode}, ${status}::"AttendanceStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("staffId", "workDate") DO UPDATE SET
          "checkInAt" = EXCLUDED."checkInAt",
          "shiftCode" = EXCLUDED."shiftCode",
          "status" = EXCLUDED."status",
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "id", "workDate", "checkInAt", "checkOutAt", "shiftCode", "status", "note"`,
    );
    return rows[0];
  }

  async checkOut(staffId: string) {
    const today = formatDateInDaNang(new Date());
    const current = await this.findOpenAttendance(staffId, today);
    if (!current?.checkInAt) throw new NotFoundException('Bạn chưa vào ca hôm nay');
    if (current.checkOutAt) throw new ConflictException('Bạn đã ra ca hôm nay');
    const rows = await this.prisma.$queryRaw<AttendanceRow[]>(
      Prisma.sql`UPDATE "staff_attendances"
                 SET "checkOutAt" = ${new Date()}, "updatedAt" = CURRENT_TIMESTAMP
                 WHERE "id" = ${current.id}
                 RETURNING "id", "workDate", "checkInAt", "checkOutAt", "shiftCode", "status", "note"`,
    );
    return rows[0];
  }

  private async findAttendance(staffId: string, date: string) {
    const rows = await this.prisma.$queryRaw<AttendanceRow[]>(
      Prisma.sql`SELECT "id", "workDate", "checkInAt", "checkOutAt", "shiftCode", "status", "note"
                 FROM "staff_attendances"
                 WHERE "staffId" = ${staffId} AND "workDate" = ${date}::date
                 LIMIT 1`,
    );
    return rows[0] || null;
  }

  private async findOpenAttendance(staffId: string, today: string) {
    const rows = await this.prisma.$queryRaw<AttendanceRow[]>(
      Prisma.sql`SELECT "id", "workDate", "checkInAt", "checkOutAt", "shiftCode", "status", "note"
                 FROM "staff_attendances"
                 WHERE "staffId" = ${staffId}
                   AND "checkInAt" IS NOT NULL
                   AND "checkOutAt" IS NULL
                   AND "workDate" >= (${today}::date - INTERVAL '1 day')
                 ORDER BY "workDate" DESC
                 LIMIT 1`,
    );
    return rows[0] || null;
  }
}
