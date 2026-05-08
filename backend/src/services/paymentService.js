// Backend Service Layer - Payment Service
// Handles payment operations (PIX, Boleto, Credit Card)

const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class PaymentService {
  /**
   * Create PIX payment
   */
  static async createPixPayment(orderId, amount) {
    const connection = await pool.getConnection();
    try {
      const paymentId = uuidv4();
      const pixKey = this.generatePixKey();
      const qrCode = this.generateQRCode(pixKey);

      await connection.execute(
        'INSERT INTO payments (id, order_id, payment_method, amount, pix_key, pix_qr_code, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [paymentId, orderId, 'pix', amount, pixKey, qrCode, 'pending']
      );

      // Update order status
      await connection.execute(
        'UPDATE orders SET payment_method = ?, status = ? WHERE id = ?',
        ['pix', 'processing', orderId]
      );

      return {
        id: paymentId,
        orderId,
        method: 'pix',
        amount,
        pixKey,
        qrCode,
        status: 'pending'
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Create Boleto payment
   */
  static async createBoletoPayment(orderId, amount) {
    const connection = await pool.getConnection();
    try {
      const paymentId = uuidv4();
      const boletoCode = this.generateBoletoCode();

      await connection.execute(
        'INSERT INTO payments (id, order_id, payment_method, amount, boleto_code, status) VALUES (?, ?, ?, ?, ?, ?)',
        [paymentId, orderId, 'boleto', amount, boletoCode, 'pending']
      );

      // Update order status
      await connection.execute(
        'UPDATE orders SET payment_method = ?, status = ? WHERE id = ?',
        ['boleto', 'processing', orderId]
      );

      return {
        id: paymentId,
        orderId,
        method: 'boleto',
        amount,
        boletoCode,
        status: 'pending'
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Create Credit Card payment
   */
  static async createCreditCardPayment(orderId, amount, cardLastFour) {
    const connection = await pool.getConnection();
    try {
      const paymentId = uuidv4();

      await connection.execute(
        'INSERT INTO payments (id, order_id, payment_method, amount, card_last_4, status) VALUES (?, ?, ?, ?, ?, ?)',
        [paymentId, orderId, 'credit_card', amount, cardLastFour, 'pending']
      );

      // Update order status
      await connection.execute(
        'UPDATE orders SET payment_method = ?, status = ? WHERE id = ?',
        ['credit_card', 'processing', orderId]
      );

      return {
        id: paymentId,
        orderId,
        method: 'credit_card',
        amount,
        cardLastFour,
        status: 'pending'
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(paymentId) {
    const connection = await pool.getConnection();
    try {
      const [payments] = await connection.execute(
        'SELECT * FROM payments WHERE id = ?',
        [paymentId]
      );

      if (payments.length === 0) {
        throw new Error('Payment not found');
      }

      return payments[0];
    } finally {
      connection.release();
    }
  }

  /**
   * Confirm payment (webhook simulation)
   */
  static async confirmPayment(paymentId) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE payments SET status = ? WHERE id = ?',
        ['approved', paymentId]
      );

      // Get order and update its status
      const [payments] = await connection.execute(
        'SELECT order_id FROM payments WHERE id = ?',
        [paymentId]
      );

      if (payments.length > 0) {
        await connection.execute(
          'UPDATE orders SET status = ? WHERE id = ?',
          ['completed', payments[0].order_id]
        );
      }

      return await this.getPaymentStatus(paymentId);
    } finally {
      connection.release();
    }
  }

  /**
   * Decline payment
   */
  static async declinePayment(paymentId, reason) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        'UPDATE payments SET status = ? WHERE id = ?',
        ['declined', paymentId]
      );

      // Get order and update its status
      const [payments] = await connection.execute(
        'SELECT order_id FROM payments WHERE id = ?',
        [paymentId]
      );

      if (payments.length > 0) {
        await connection.execute(
          'UPDATE orders SET status = ? WHERE id = ?',
          ['failed', payments[0].order_id]
        );
      }

      return await this.getPaymentStatus(paymentId);
    } finally {
      connection.release();
    }
  }

  /**
   * Helper: Generate PIX key
   */
  static generatePixKey() {
    return 'pix_' + uuidv4().replace(/-/g, '').substring(0, 20);
  }

  /**
   * Helper: Generate QR Code (simplified)
   */
  static generateQRCode(pixKey) {
    // In production, use a library like qrcode to generate proper QR codes
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='white'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='12'%3E${pixKey}%3C/text%3E%3C/svg%3E`;
  }

  /**
   * Helper: Generate Boleto code
   */
  static generateBoletoCode() {
    const bank = '001'; // Banco do Brasil
    const sequence = Math.random().toString(36).substring(2, 15).padEnd(13, '0');
    return `${bank}${sequence}`;
  }
}

module.exports = PaymentService;
