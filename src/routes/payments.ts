// backend/src/routes/payments.ts
import express from 'express';
import Payment from '../models/Payment';
import Project from '../models/Project';
import User from '../models/User';
import { requireAuth } from '../middlewares/auth';
import { RequestWithUser } from '../types';
import mpesaService from '../services/mpesa.service';

const router = express.Router();

// Platform fee percentage (10%)
const PLATFORM_FEE_PERCENT = 0.10;

// ─── Initiate Payment (Client) ───────────────────────────────────────────────
router.post('/initiate', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const { projectId, amount, phoneNumber, paymentMethod } = req.body;

    // Validate
    if (!projectId || !amount || !phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project ID, amount, and phone number are required' 
      });
    }

    // Get project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Verify client owns project
    if (project.client.clerkId !== user.clerkId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Verify project has designer
    if (!project.designer) {
      return res.status(400).json({ success: false, error: 'Project must have assigned designer' });
    }

    // Calculate fees
    const totalAmount = Number(amount);
    const platformFee = Math.round(totalAmount * PLATFORM_FEE_PERCENT);
    const designerAmount = totalAmount - platformFee;

    // Create payment record
    const payment = new Payment({
      project: projectId,
      client: user._id,
      designer: project.designer,
      amount: totalAmount,
      platformFee,
      designerAmount,
      paymentMethod: paymentMethod || 'mpesa',
      status: 'pending',
      description: `Payment for project: ${project.title}`,
      mpesaPhoneNumber: phoneNumber,
    });

    await payment.save();

    // Initiate M-Pesa STK Push
    if (paymentMethod === 'mpesa') {
      try {
        const stkResponse = await mpesaService.stkPush({
          phoneNumber,
          amount: totalAmount,
          accountReference: `PRJ-${projectId.toString().slice(-8)}`,
          transactionDesc: `Payment for ${project.title}`,
          callbackUrl: `${process.env.BASE_URL}/api/payments/mpesa/callback`,
        });

        // Update payment with M-Pesa details
        payment.mpesaCheckoutRequestID = stkResponse.CheckoutRequestID;
        await payment.save();

        return res.json({
          success: true,
          payment: {
            _id: payment._id,
            amount: totalAmount,
            platformFee,
            designerAmount,
            status: payment.status,
          },
          mpesa: {
            checkoutRequestID: stkResponse.CheckoutRequestID,
            message: stkResponse.CustomerMessage,
          },
        });
      } catch (mpesaError: any) {
        payment.status = 'failed';
        await payment.save();
        
        return res.status(400).json({
          success: false,
          error: mpesaError.message || 'M-Pesa payment failed',
        });
      }
    }

    res.json({ success: true, payment });
  } catch (error: any) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate payment' });
  }
});

// ─── M-Pesa Callback ──────────────────────────────────────────────────────────
router.post('/mpesa/callback', async (req, res) => {
  try {
    console.log('M-Pesa Callback:', JSON.stringify(req.body, null, 2));

    const { Body } = req.body;
    if (!Body || !Body.stkCallback) {
      return res.status(400).json({ success: false, error: 'Invalid callback' });
    }

    const { stkCallback } = Body;
    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;

    // Find payment
    const payment = await Payment.findOne({ mpesaCheckoutRequestID: checkoutRequestID });
    if (!payment) {
      console.error('Payment not found for CheckoutRequestID:', checkoutRequestID);
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Payment successful
    if (resultCode === 0) {
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
      const receiptNumber = callbackMetadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;

      payment.status = 'held'; // Money is now held in escrow
      payment.heldAt = new Date();
      payment.mpesaReceiptNumber = receiptNumber;
      payment.metadata = stkCallback;

      await payment.save();

      console.log(`✅ Payment ${payment._id} successful. Amount held in escrow.`);
    } 
    // Payment failed
    else {
      payment.status = 'failed';
      payment.metadata = stkCallback;
      await payment.save();

      console.log(`❌ Payment ${payment._id} failed. Code: ${resultCode}`);
    }

    // Always return 200 to M-Pesa
    res.json({ success: true });
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(200).json({ success: true }); // Still return 200
  }
});

// ─── Check Payment Status ─────────────────────────────────────────────────────
router.get('/status/:paymentId', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const payment = await Payment.findById(req.params.paymentId)
      .populate('project', 'title')
      .populate('designer', 'name');

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Verify user is client or designer
    const isClient = payment.client.toString() === user._id.toString();
    const isDesigner = payment.designer.toString() === user._id.toString();

    if (!isClient && !isDesigner && !user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get payment status' });
  }
});

// ─── Release Payment to Designer ──────────────────────────────────────────────
router.post('/release/:paymentId', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const payment = await Payment.findById(req.params.paymentId).populate('project');
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Only client or admin can release payment
    const isClient = payment.client.toString() === user._id.toString();
    if (!isClient && !user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Only client can release payment' });
    }

    // Payment must be held
    if (payment.status !== 'held') {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot release payment with status: ${payment.status}` 
      });
    }

    // Get designer info
    const designer = await User.findById(payment.designer);
    if (!designer || !designer.phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Designer phone number not found' 
      });
    }

    // Send B2C payment to designer
    try {
      const b2cResponse = await mpesaService.b2cPayment(
        designer.phone,
        payment.designerAmount,
        `Payment for project: ${(payment.project as any).title}`
      );

      payment.status = 'released';
      payment.releasedAt = new Date();
      payment.metadata = { ...payment.metadata, b2cResponse };
      await payment.save();

      res.json({
        success: true,
        message: `KSh ${payment.designerAmount.toLocaleString()} released to designer`,
        payment,
      });
    } catch (b2cError: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send payment to designer: ' + b2cError.message,
      });
    }
  } catch (error: any) {
    console.error('Release payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to release payment' });
  }
});

// ─── Refund Payment (Admin/Dispute) ───────────────────────────────────────────
router.post('/refund/:paymentId', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  // Only admins can refund
  if (!user.isAdmin) {
    return res.status(403).json({ success: false, error: 'Admin only' });
  }

  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.status !== 'held') {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot refund payment with status: ${payment.status}` 
      });
    }

    // Get client info
    const client = await User.findById(payment.client);
    if (!client || !client.phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Client phone number not found' 
      });
    }

    // Send refund via B2C
    try {
      const refundResponse = await mpesaService.b2cPayment(
        client.phone,
        payment.amount, // Full refund
        `Refund for project payment`
      );

      payment.status = 'refunded';
      payment.refundedAt = new Date();
      payment.metadata = { ...payment.metadata, refundResponse };
      await payment.save();

      res.json({
        success: true,
        message: `KSh ${payment.amount.toLocaleString()} refunded to client`,
        payment,
      });
    } catch (refundError: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to refund payment: ' + refundError.message,
      });
    }
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to refund payment' });
  }
});

// ─── Get All Payments (Client/Designer Dashboard) ─────────────────────────────
router.get('/my-payments', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const query: any = {
      $or: [
        { client: user._id },
        { designer: user._id },
      ],
    };

    const payments = await Payment.find(query)
      .populate('project', 'title')
      .populate('client', 'name')
      .populate('designer', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ success: false, error: 'Failed to get payments' });
  }
});

export default router;