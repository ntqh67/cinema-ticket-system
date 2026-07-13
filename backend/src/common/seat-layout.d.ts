// Khai báo kiểu TypeScript cho tiện ích JavaScript dùng chung với Prisma seed.
export interface VipZone {
  rows: Set<string>;
  colStart: number;
  colEnd: number;
}

export function getVipZone(rows: string[], columns: number): VipZone;
export function addMinutes(date: Date, minutes: number): Date;
