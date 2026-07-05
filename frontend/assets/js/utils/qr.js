/* CineTicket - Local QR renderer (QR Code version 4-L, byte mode) */
const QR = {
  version: 4,
  size: 33,
  dataCodewords: 80,
  eccCodewords: 20,
  formatBits: '111011111000100',

  toSvg(data, options = {}) {
    const scale = options.scale || 7;
    const quiet = options.quiet || 4;
    const matrix = this._matrix(String(data || ''));
    const fullSize = this.size + quiet * 2;
    const rects = [];

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
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

  shortCode(data) {
    const value = String(data || '');
    if (value.length <= 10) return value;
    return `${value.slice(0, 4)}...${value.slice(-6)}`;
  },

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

  _encodeData(data) {
    const raw = new TextEncoder().encode(data);
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
    for (let i = 0; i < terminator; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const codewords = [];
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

  _drawFunctionPatterns(matrix, reserved) {
    this._finder(matrix, reserved, 0, 0);
    this._finder(matrix, reserved, this.size - 7, 0);
    this._finder(matrix, reserved, 0, this.size - 7);
    this._alignment(matrix, reserved, 26, 26);

    for (let i = 0; i < this.size; i++) {
      this._setReserved(reserved, 6, i);
      this._setReserved(reserved, i, 6);
      if (!reserved[6][i]) matrix[6][i] = i % 2 === 0;
      if (!reserved[i][6]) matrix[i][6] = i % 2 === 0;
    }

    for (let i = 0; i < 9; i++) {
      this._setReserved(reserved, 8, i);
      this._setReserved(reserved, i, 8);
      this._setReserved(reserved, this.size - 1 - i, 8);
      this._setReserved(reserved, 8, this.size - 1 - i);
    }
    matrix[4 * this.version + 9][8] = true;
    reserved[4 * this.version + 9][8] = true;
  },

  _finder(matrix, reserved, x, y) {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= this.size || yy >= this.size) continue;
        reserved[yy][xx] = true;
        const inOuter = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const inInner = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        const onRing = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        matrix[yy][xx] = inOuter && (onRing || inInner);
      }
    }
  },

  _alignment(matrix, reserved, cx, cy) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        reserved[y][x] = true;
        matrix[y][x] = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
      }
    }
  },

  _drawData(matrix, reserved, bits) {
    let bitIndex = 0;
    let upward = true;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right--;
      for (let vert = 0; vert < this.size; vert++) {
        const y = upward ? this.size - 1 - vert : vert;
        for (let dx = 0; dx < 2; dx++) {
          const x = right - dx;
          if (reserved[y][x]) continue;
          matrix[y][x] = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
          bitIndex++;
        }
      }
      upward = !upward;
    }
  },

  _applyMask0(matrix, reserved) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!reserved[y][x] && (x + y) % 2 === 0) {
          matrix[y][x] = !matrix[y][x];
        }
      }
    }
  },

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

  _rsGenerator(degree) {
    let poly = [1];
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

  _gfMul(a, b) {
    let result = 0;
    for (let i = 0; i < 8; i++) {
      if (b & 1) result ^= a;
      const carry = a & 0x80;
      a = (a << 1) & 0xff;
      if (carry) a ^= 0x1d;
      b >>= 1;
    }
    return result;
  },

  _gfPow(a, n) {
    let result = 1;
    for (let i = 0; i < n; i++) result = this._gfMul(result, a);
    return result;
  },

  _byteBits(byte) {
    return this._numberBits(byte, 8);
  },

  _numberBits(value, length) {
    return Array.from({ length }, (_, i) => (value >> (length - 1 - i)) & 1);
  },

  _setReserved(reserved, x, y) {
    if (x >= 0 && y >= 0 && x < this.size && y < this.size) reserved[y][x] = true;
  },
};
