// Quy tắc origin cho phép dùng chung cho HTTP (main.ts) và Socket.IO gateway.
const DEV_PORTS = ['3000', '5173'];

// Cho phép client không có origin và localhost/mạng LAN trên cổng phát triển.
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin || origin === 'null') return true;
  try {
    const url = new URL(origin);
    const isLocalHost = ['localhost', '127.0.0.1'].includes(url.hostname);
    const isLanHost =
      url.hostname.startsWith('192.168.') ||
      url.hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname);
    return DEV_PORTS.includes(url.port) && (isLocalHost || isLanHost);
  } catch {
    return false;
  }
}

// Dạng callback mà cả enableCors và Socket.IO đều chấp nhận.
export function corsOriginCallback(
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void {
  callback(null, isAllowedOrigin(origin));
}
