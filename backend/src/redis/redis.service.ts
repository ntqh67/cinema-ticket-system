import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Socket } from 'net';

type RedisValue = string | number | null | RedisValue[];

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly host: string;
  private readonly port: number;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const url = new URL(redisUrl);
    this.host = url.hostname || 'localhost';
    this.port = Number(url.port || 6379);
  }

  onModuleDestroy() {
    return undefined;
  }

  async get(key: string) {
    const value = await this.command(['GET', key]);
    return typeof value === 'string' ? value : null;
  }

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

  async setEx(key: string, seconds: number, value: string) {
    const result = await this.command(['SET', key, value, 'EX', String(seconds)]);
    return result === 'OK';
  }

  async del(...keys: string[]) {
    if (keys.length === 0) return 0;
    const result = await this.command(['DEL', ...keys]);
    return typeof result === 'number' ? result : 0;
  }

  async keys(pattern: string) {
    const result = await this.command(['KEYS', pattern]);
    return Array.isArray(result)
      ? result.filter((item): item is string => typeof item === 'string')
      : [];
  }

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
        try {
          const buffer = Buffer.concat(chunks);
          const [value] = this.parse(buffer.toString('utf8'), 0);
          socket.end();
          resolve(value);
        } catch (error) {
          if (error instanceof Error && error.message === 'Incomplete Redis response') {
            return;
          }
          socket.destroy();
          reject(error);
        }
      });
    });
  }

  private encode(args: string[]) {
    return `*${args.length}\r\n${args
      .map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`)
      .join('')}`;
  }

  private parse(input: string, offset: number): [RedisValue, number] {
    const type = input[offset];
    const lineEnd = input.indexOf('\r\n', offset);
    if (lineEnd === -1) {
      throw new Error('Incomplete Redis response');
    }
    const line = input.slice(offset + 1, lineEnd);

    if (type === '+') return [line, lineEnd + 2];
    if (type === ':') return [Number(line), lineEnd + 2];
    if (type === '-') throw new Error(line);
    if (type === '$') {
      const length = Number(line);
      if (length === -1) return [null, lineEnd + 2];
      const start = lineEnd + 2;
      if (input.length < start + length + 2) {
        throw new Error('Incomplete Redis response');
      }
      return [input.slice(start, start + length), start + length + 2];
    }
    if (type === '*') {
      const count = Number(line);
      let cursor = lineEnd + 2;
      const values: RedisValue[] = [];
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
