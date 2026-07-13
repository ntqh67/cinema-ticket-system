/**
 * Mục đích: Cài đặt nghiệp vụ kết nối Redis; dữ liệu bền vững được truy cập qua Prisma.
 */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Socket } from 'net';

type RedisValue = string | number | null | RedisValue[];

@Injectable()
// Lớp RedisService tập trung các quy tắc nghiệp vụ và phối hợp truy cập dữ liệu.
export class RedisService implements OnModuleDestroy {
  private readonly host: string;
  private readonly port: number;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const url = new URL(redisUrl);
    this.host = url.hostname || 'localhost';
    this.port = Number(url.port || 6379);
  }

  // Thực hiện trách nhiệm riêng của khối onModuleDestroy.
  onModuleDestroy() {
    return undefined;
  }

  // Đọc và lọc dữ liệu cần thiết trong khối get.
  async get(key: string) {
    const value = await this.command(['GET', key]);
    return typeof value === 'string' ? value : null;
  }

  // Đọc và lọc dữ liệu cần thiết trong khối mGet.
  async mGet(keys: string[]) {
    // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
    if (keys.length === 0) return [];
    const result = await this.command(['MGET', ...keys]);
    return Array.isArray(result)
      ? result.map((item) => (typeof item === 'string' ? item : null))
      : [];
  }

  // Cập nhật trạng thái hoặc dữ liệu trong khối setNxEx.
  async setNxEx(key: string, seconds: number, value: string) {
    const result = await this.command([
      'SET',
      key,
      value,
      'NX',
      'EX',
      String(seconds),
    ]);
    return result === 'OK';
  }

  // Cập nhật trạng thái hoặc dữ liệu trong khối setEx.
  async setEx(key: string, seconds: number, value: string) {
    const result = await this.command(['SET', key, value, 'EX', String(seconds)]);
    return result === 'OK';
  }

  // Thực hiện trách nhiệm riêng của khối del.
  async del(...keys: string[]) {
    // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
    if (keys.length === 0) return 0;
    const result = await this.command(['DEL', ...keys]);
    return typeof result === 'number' ? result : 0;
  }

  // Thực hiện trách nhiệm riêng của khối keys.
  async keys(pattern: string) {
    const result = await this.command(['KEYS', pattern]);
    return Array.isArray(result)
      ? result.filter((item): item is string => typeof item === 'string')
      : [];
  }

  // Thực hiện trách nhiệm riêng của khối eval.
  async eval(script: string, keys: string[], args: string[] = []) {
    return this.command([
      'EVAL',
      script,
      String(keys.length),
      ...keys,
      ...args,
    ]);
  }

  // Thực hiện trách nhiệm riêng của khối command.
  private command(args: string[]) {
    return new Promise<RedisValue>((resolve, reject) => {
      const socket = new Socket();
      const chunks: Buffer[] = [];
      const payload = this.encode(args);

      socket.setTimeout(5000);
      socket.once('error', reject);
      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error('Redis command timed out'));
      });
      socket.connect(this.port, this.host, () => socket.write(payload));
      socket.on('data', (chunk) => {
        chunks.push(chunk);
        // Bắt đầu khối thao tác có thể phát sinh lỗi để phần xử lý lỗi phía sau tiếp nhận.
        try {
          const buffer = Buffer.concat(chunks);
          const [value] = this.parse(buffer.toString('utf8'), 0);
          socket.end();
          resolve(value);
        } catch (error) {
          // Kiểm tra kết quả thao tác và chuyển sang nhánh lỗi khi cần.
          if (error instanceof Error && error.message === 'Incomplete Redis response') {
            return;
          }
          socket.destroy();
          reject(error);
        }
      });
    });
  }

  // Thực hiện trách nhiệm riêng của khối encode.
  private encode(args: string[]) {
    return `*${args.length}\r\n${args
      .map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`)
      .join('')}`;
  }

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối parse.
  private parse(input: string, offset: number): [RedisValue, number] {
    const type = input[offset];
    const lineEnd = input.indexOf('\r\n', offset);
    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (lineEnd === -1) {
      throw new Error('Incomplete Redis response');
    }
    const line = input.slice(offset + 1, lineEnd);

    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (type === '+') return [line, lineEnd + 2];
    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (type === ':') return [Number(line), lineEnd + 2];
    // Kiểm tra kết quả thao tác và chuyển sang nhánh lỗi khi cần.
    if (type === '-') throw new Error(line);
    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (type === '$') {
      const length = Number(line);
      // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
      if (length === -1) return [null, lineEnd + 2];
      const start = lineEnd + 2;
      // Kiểm tra số lượng phần tử để xử lý trường hợp rỗng hoặc vượt giới hạn.
      if (input.length < start + length + 2) {
        throw new Error('Incomplete Redis response');
      }
      return [input.slice(start, start + length), start + length + 2];
    }
    // Đánh giá điều kiện để chọn nhánh xử lý phù hợp và tránh cập nhật sai trạng thái.
    if (type === '*') {
      const count = Number(line);
      let cursor = lineEnd + 2;
      const values: RedisValue[] = [];
      // Duyệt tập dữ liệu để xử lý từng phần tử theo cùng một quy tắc.
      for (let index = 0; index < count; index += 1) {
        const [value, next] = this.parse(input, cursor);
        values.push(value);
        cursor = next;
      }
      return [values, cursor];
    }

    throw new Error('Unsupported Redis response');
  }
}
