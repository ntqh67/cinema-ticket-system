-- Mục đích: Migration PostgreSQL; mỗi khối lần lượt thay đổi cấu trúc, chỉ mục hoặc khóa ngoại.
-- Thay đổi bảng cinemas để lưu đường dẫn ảnh đại diện của rạp.
ALTER TABLE "cinemas" ADD COLUMN     "imageUrl" TEXT;
