import { applyDecorators } from '@nestjs/common';
import { IsString, MinLength, registerDecorator } from 'class-validator';

// bcrypt chỉ xử lý tối đa 72 byte; dùng cùng quy tắc cho các nơi tạo mật khẩu.
export function Password() {
  return applyDecorators(
    IsString(),
    MinLength(6),
    (target: object, propertyName: string | symbol) => {
      registerDecorator({
        name: 'bcryptPassword',
        target: target.constructor,
        propertyName: String(propertyName),
        options: { message: 'Mật khẩu không được vượt quá 72 byte UTF-8' },
        validator: {
          validate: (value: unknown) =>
            typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72,
        },
      });
    },
  );
}
