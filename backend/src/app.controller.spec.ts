/**
 * Mục đích: Kiểm thử các hành vi và ràng buộc quan trọng của miền khởi tạo và tiện ích dùng chung.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  // Thực hiện trách nhiệm riêng của khối beforeEach.
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  // Thực hiện trách nhiệm riêng của khối describe.
  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
