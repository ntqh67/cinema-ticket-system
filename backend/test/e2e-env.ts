// Khóa ký chỉ dành cho test; TokenService từ chối khởi động nếu thiếu.
process.env.JWT_ACCESS_SECRET = 'e2e-secret-'.padEnd(40, 'x');
