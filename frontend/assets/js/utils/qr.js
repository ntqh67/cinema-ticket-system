/**
 * Mục đích: Mã nguồn phục vụ khởi tạo và tiện ích dùng chung; các khối bên dưới được giữ tách biệt theo trách nhiệm.
 */
/* CineTicket - Bộ dựng mã QR cục bộ, phiên bản 4-L và chế độ byte */
// Đối tượng QR gom các hành vi có cùng trách nhiệm để các phần khác tái sử dụng.
const QR = {
  version: 4,
  size: 33,
  dataCodewords: 80,
  eccCodewords: 20,
  formatBits: '111011111000100',

  // Thực hiện trách nhiệm riêng của khối toSvg.
  toSvg(data, options = {}) {
    const scale = options.scale || 7;
    const quiet = options.quiet || 4;
    const matrix = this._matrix(String(data || ''));
    const fullSize = this.size + quiet * 2;
    const rects = [];

    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let y = 0; y < this.size; y++) {
      // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
      for (let x = 0; x < this.size; x++) {
        // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
        if (matrix[y][x]) {
          rects.push(`<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1"/>`);
        }
      }
    }

    return `
      <svg class="qr-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fullSize} ${fullSize}" role="img" aria-label="Ticket QR">
        <rect width="${fullSize}" height="${fullSize}" fill="#fff"/>
        <g fill="#111">${rects.join('')}</g>
      </svg>`;
  },

  // Thực hiện trách nhiệm riêng của khối shortCode.
  shortCode(data) {
    const value = String(data || '');
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (value.length <= 10) return value;
    return `${value.slice(0, 4)}...${value.slice(-6)}`;
  },

  // Thực hiện trách nhiệm riêng của khối _matrix.
  _matrix(data) {
    const bytes = this._encodeData(data);
    const ecc = this._reedSolomon(bytes, this.eccCodewords);
    const bits = [...bytes, ...ecc].flatMap((byte) => this._byteBits(byte));
    const matrix = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    const reserved = Array.from({ length: this.size }, () => Array(this.size).fill(false));

    this._drawFunctionPatterns(matrix, reserved);
    this._drawData(matrix, reserved, bits);
    this._applyMask0(matrix, reserved);
    this._drawFormat(matrix, reserved);

    return matrix;
  },

  // Thực hiện trách nhiệm riêng của khối _encodeData.
  _encodeData(data) {
    const raw = new TextEncoder().encode(data);
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (raw.length > 78) {
      throw new Error('QR data is too long for local renderer');
    }

    const bits = [
      0, 1, 0, 0,
      ...this._numberBits(raw.length, 8),
    ];
    raw.forEach((byte) => bits.push(...this._byteBits(byte)));

    const capacityBits = this.dataCodewords * 8;
    const terminator = Math.min(4, capacityBits - bits.length);
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let i = 0; i < terminator; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const codewords = [];
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let i = 0; i < bits.length; i += 8) {
      codewords.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    }
    let pad = 0;
    while (codewords.length < this.dataCodewords) {
      codewords.push(pad % 2 === 0 ? 0xec : 0x11);
      pad++;
    }
    return codewords;
  },

  // Thực hiện trách nhiệm riêng của khối _drawFunctionPatterns.
  _drawFunctionPatterns(matrix, reserved) {
    this._finder(matrix, reserved, 0, 0);
    this._finder(matrix, reserved, this.size - 7, 0);
    this._finder(matrix, reserved, 0, this.size - 7);
    this._alignment(matrix, reserved, 26, 26);

    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let i = 0; i < this.size; i++) {
      this._setReserved(reserved, 6, i);
      this._setReserved(reserved, i, 6);
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (!reserved[6][i]) matrix[6][i] = i % 2 === 0;
      // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
      if (!reserved[i][6]) matrix[i][6] = i % 2 === 0;
    }

    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let i = 0; i < 9; i++) {
      this._setReserved(reserved, 8, i);
      this._setReserved(reserved, i, 8);
      this._setReserved(reserved, this.size - 1 - i, 8);
      this._setReserved(reserved, 8, this.size - 1 - i);
    }
    matrix[4 * this.version + 9][8] = true;
    reserved[4 * this.version + 9][8] = true;
  },

  // Đọc và lọc dữ liệu cần thiết trong khối _finder.
  _finder(matrix, reserved, x, y) {
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let dy = -1; dy <= 7; dy++) {
      // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
      for (let dx = -1; dx <= 7; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
        if (xx < 0 || yy < 0 || xx >= this.size || yy >= this.size) continue;
        reserved[yy][xx] = true;
        const inOuter = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const inInner = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        const onRing = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        matrix[yy][xx] = inOuter && (onRing || inInner);
      }
    }
  },

  // Thực hiện trách nhiệm riêng của khối _alignment.
  _alignment(matrix, reserved, cx, cy) {
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let dy = -2; dy <= 2; dy++) {
      // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
      for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        reserved[y][x] = true;
        matrix[y][x] = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
      }
    }
  },

  // Thực hiện trách nhiệm riêng của khối _drawData.
  _drawData(matrix, reserved, bits) {
    let bitIndex = 0;
    let upward = true;
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let right = this.size - 1; right >= 1; right -= 2) {
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (right === 6) right--;
      // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
      for (let vert = 0; vert < this.size; vert++) {
        const y = upward ? this.size - 1 - vert : vert;
        // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
        for (let dx = 0; dx < 2; dx++) {
          const x = right - dx;
          // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
          if (reserved[y][x]) continue;
          matrix[y][x] = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
          bitIndex++;
        }
      }
      upward = !upward;
    }
  },

  // Thực hiện trách nhiệm riêng của khối _applyMask0.
  _applyMask0(matrix, reserved) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
        if (!reserved[y][x] && (x + y) % 2 === 0) {
          matrix[y][x] = !matrix[y][x];
        }
      }
    }
  },

  // Chuẩn hóa dữ liệu đầu vào/đầu ra trong khối _drawFormat.
  _drawFormat(matrix, reserved) {
    const bits = this.formatBits.split('').map((bit) => bit === '1');
    const a = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    ];
    const b = [
      [this.size - 1, 8], [this.size - 2, 8], [this.size - 3, 8], [this.size - 4, 8],
      [this.size - 5, 8], [this.size - 6, 8], [this.size - 7, 8], [8, this.size - 8],
      [8, this.size - 7], [8, this.size - 6], [8, this.size - 5], [8, this.size - 4],
      [8, this.size - 3], [8, this.size - 2], [8, this.size - 1],
    ];
    a.forEach(([x, y], i) => {
      matrix[y][x] = bits[i];
      reserved[y][x] = true;
    });
    b.forEach(([x, y], i) => {
      matrix[y][x] = bits[i];
      reserved[y][x] = true;
    });
  },

  // Thực hiện trách nhiệm riêng của khối _reedSolomon.
  _reedSolomon(data, degree) {
    const generator = this._rsGenerator(degree);
    const result = Array(degree).fill(0);
    data.forEach((byte) => {
      const factor = byte ^ result.shift();
      result.push(0);
      generator.forEach((coefficient, i) => {
        result[i] ^= this._gfMul(coefficient, factor);
      });
    });
    return result;
  },

  // Thực hiện trách nhiệm riêng của khối _rsGenerator.
  _rsGenerator(degree) {
    let poly = [1];
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let i = 0; i < degree; i++) {
      const next = Array(poly.length + 1).fill(0);
      poly.forEach((coefficient, j) => {
        next[j] ^= this._gfMul(coefficient, 1);
        next[j + 1] ^= this._gfMul(coefficient, this._gfPow(2, i));
      });
      poly = next;
    }
    return poly.slice(1);
  },

  // Thực hiện trách nhiệm riêng của khối _gfMul.
  _gfMul(a, b) {
    let result = 0;
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let i = 0; i < 8; i++) {
      // Kiểm tra kết quả từ backend và chuyển sang nhánh báo lỗi khi cần.
      if (b & 1) result ^= a;
      const carry = a & 0x80;
      a = (a << 1) & 0xff;
      // Đánh giá điều kiện hiện tại để cập nhật giao diện và trạng thái đúng nhánh.
      if (carry) a ^= 0x1d;
      b >>= 1;
    }
    return result;
  },

  // Thực hiện trách nhiệm riêng của khối _gfPow.
  _gfPow(a, n) {
    let result = 1;
    // Duyệt danh sách để dựng hoặc cập nhật từng phần tử giao diện.
    for (let i = 0; i < n; i++) result = this._gfMul(result, a);
    return result;
  },

  // Thực hiện trách nhiệm riêng của khối _byteBits.
  _byteBits(byte) {
    return this._numberBits(byte, 8);
  },

  // Thực hiện trách nhiệm riêng của khối _numberBits.
  _numberBits(value, length) {
    return Array.from({ length }, (_, i) => (value >> (length - 1 - i)) & 1);
  },

  // Cập nhật trạng thái hoặc dữ liệu trong khối _setReserved.
  _setReserved(reserved, x, y) {
    // Xử lý riêng trường hợp danh sách rỗng hoặc có số lượng không hợp lệ.
    if (x >= 0 && y >= 0 && x < this.size && y < this.size) reserved[y][x] = true;
  },
};
