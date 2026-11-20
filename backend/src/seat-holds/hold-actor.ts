import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

// USER chỉ được dựng từ phiên đã xác thực; guest proof không thay thế userId.
export type UserHoldActor = {
  type: 'USER';
  userId: string;
  guestSessionId?: string;
};
export type HoldActor = UserHoldActor | { type: 'GUEST'; guestSessionId: string };
export type SeatHoldOwner =
  | { ownerType: 'USER'; userId: string }
  | { ownerType: 'GUEST'; guestSessionId: string };

// Ưu tiên danh tính phiên; người xem công khai có thể chưa có guest proof.
export function resolveHoldActor(
  user: Pick<AuthenticatedUser, 'id'> | undefined,
  guestSessionId?: string,
): HoldActor | undefined {
  if (user) return { type: 'USER', userId: user.id, guestSessionId };
  if (guestSessionId) return { type: 'GUEST', guestSessionId };
  return undefined;
}

// Đọc ownership chính xác; chỉ Lua acquire/bind mới được chuyển GUEST sang USER.
export function ownsHold(hold: SeatHoldOwner, actor?: HoldActor): boolean {
  if (hold.ownerType === 'USER' && actor?.type === 'USER')
    return hold.userId === actor.userId;
  if (hold.ownerType === 'GUEST' && actor?.type === 'GUEST')
    return hold.guestSessionId === actor.guestSessionId;
  return false;
}
