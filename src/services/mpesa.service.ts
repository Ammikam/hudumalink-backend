// backend/src/services/mpesa.service.ts
import axios from 'axios';

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  environment: 'sandbox' | 'production';
}

interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

class MpesaService {
  private config: MpesaConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      consumerKey:    (process.env.MPESA_CONSUMER_KEY    || '').trim(),
      consumerSecret: (process.env.MPESA_CONSUMER_SECRET || '').trim(),
      passkey:        (process.env.MPESA_PASSKEY         || '').trim(),
      shortcode:      (process.env.MPESA_SHORTCODE       || '').trim(),
      environment:    (process.env.MPESA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    };

    this.baseUrl = this.config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  // ✅ Shared sanitizer — strips characters that break Safaricom's XML transformer
  private sanitize(str: string, maxLength = 100): string {
    return str
      .replace(/&/g, 'and')
      .replace(/</g, '')
      .replace(/>/g, '')
      .replace(/"/g, '')
      .replace(/'/g, '')
      .trim()
      .slice(0, maxLength);
  }

  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(
        `${this.config.consumerKey}:${this.config.consumerSecret}`
      ).toString('base64');

      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${auth}` } }
      );

      return response.data.access_token;
    } catch (error: any) {
      console.error('M-Pesa Auth Error:', error.response?.data || error.message);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, -3);

    const password = Buffer.from(
      `${this.config.shortcode}${this.config.passkey}${timestamp}`
    ).toString('base64');

    return { password, timestamp };
  }

  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/[\s\-\+]/g, '');

    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.slice(1);
    }

    if (formatted.startsWith('7') || formatted.startsWith('1')) {
      formatted = '254' + formatted;
    }

    if (!formatted.startsWith('254') || formatted.length !== 12) {
      throw new Error('Invalid phone number format. Use 254XXXXXXXXX or 07XXXXXXXX');
    }

    return formatted;
  }

  async stkPush(request: STKPushRequest): Promise<STKPushResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();
      const phoneNumber = this.formatPhoneNumber(request.phoneNumber);

      const payload = {
        BusinessShortCode: this.config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(request.amount),
        PartyA: phoneNumber,
        PartyB: this.config.shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: request.callbackUrl,
        AccountReference: this.sanitize(request.accountReference, 12),
        TransactionDesc: this.sanitize(request.transactionDesc, 13),
      };

      console.log('STK Push payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('STK Push Error:', JSON.stringify(error.response?.data, null, 2));
      throw new Error(error.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment');
    }
  }

  async queryStkPushStatus(checkoutRequestID: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const payload = {
        BusinessShortCode: this.config.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID,
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('STK Query Error:', error.response?.data || error.message);
      throw new Error('Failed to query M-Pesa transaction status');
    }
  }

  verifyCallback(payload: any, signature: string): boolean {
    return payload && payload.Body && payload.Body.stkCallback;
  }

  async b2cPayment(phoneNumber: string, amount: number, remarks: string): Promise<any> {
    try {
      const accessToken    = await this.getAccessToken();
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const payload = {
        InitiatorName:       process.env.MPESA_INITIATOR_NAME,
        SecurityCredential:  process.env.MPESA_SECURITY_CREDENTIAL,
        CommandID:           'BusinessPayment',
        Amount:              Math.round(amount),
        PartyA:              this.config.shortcode,
        PartyB:              formattedPhone,
        Remarks:             this.sanitize(remarks, 100), // ✅ sanitized
        QueueTimeOutURL:     `${process.env.BASE_URL}/api/payments/mpesa/timeout`,
        ResultURL:           `${process.env.BASE_URL}/api/payments/mpesa/b2c-result`,
        Occasion:            'Designer Payment',
      };

      console.log('B2C Payment payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/mpesa/b2c/v1/paymentrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('B2C Payment Error:', JSON.stringify(error.response?.data, null, 2));
      throw new Error('Failed to send payment to designer');
    }
  }
}

export default new MpesaService();