// backend/src/routes/payments.ts
import express from 'express';
import Payment from '../models/Payment';
import Project from '../models/Project';
import User from '../models/User';
import { requireAuth } from '../middlewares/auth';
import { RequestWithUser } from '../types';
import mpesaService from '../services/mpesa.service';

const router = express.Router();

const PLATFORM_FEE_PERCENT = 0.10;

// ─── Initiate Payment (Client) ───────────────────────────────────────────────
router.post('/initiate', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const { projectId, amount, phoneNumber, paymentMethod } = req.body;

    if (!projectId || !amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Project ID, amount, and phone number are required',
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Verify client owns project
    if (project.client.clerkId !== user.clerkId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    // Project must be in payment_pending state
    if (project.status !== 'payment_pending') {
      return res.status(400).json({
        success: false,
        error: project.status === 'in_progress'
          ? 'This project has already been paid for'
          : 'Project is not ready for payment',
      });
    }

    // Must have a designer assigned
    if (!project.designer) {
      return res.status(400).json({
        success: false,
        error: 'Project must have an assigned designer before payment',
      });
    }

    // Block duplicate payments — check if a held/pending payment already exists
    const existingPayment = await Payment.findOne({
      project: projectId,
      status: { $in: ['pending', 'held'] },
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        error: 'A payment for this project is already in progress',
        paymentId: existingPayment._id,
      });
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
    if (!paymentMethod || paymentMethod === 'mpesa') {
      try {
        const stkResponse = await mpesaService.stkPush({
  phoneNumber,
  amount: totalAmount,
  accountReference: `PRJ-${projectId.toString().slice(-8)}`,
  transactionDesc: 'Project Payment', 
  callbackUrl: `${process.env.BASE_URL}/api/payments/mpesa/callback`,
});

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

    const payment = await Payment.findOne({ mpesaCheckoutRequestID: checkoutRequestID });
    if (!payment) {
      console.error('Payment not found for CheckoutRequestID:', checkoutRequestID);
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (resultCode === 0) {
      // ── Payment successful ──────────────────────────────────────────────────
      const callbackMetadata = stkCallback.CallbackMetadata?.Item || [];
      const receiptNumber = callbackMetadata.find(
        (item: any) => item.Name === 'MpesaReceiptNumber'
      )?.Value;

      payment.status = 'held';
      payment.heldAt = new Date();
      payment.mpesaReceiptNumber = receiptNumber;
      payment.metadata = stkCallback;
      await payment.save();

      // ✅ STEP 3 CHANGE: Unlock project now that funds are secured
      await Project.findByIdAndUpdate(payment.project, {
        status: 'in_progress',
      });

      console.log(`✅ Payment ${payment._id} held in escrow. Project ${payment.project} unlocked → in_progress.`);
    } else {
      // ── Payment failed ──────────────────────────────────────────────────────
      payment.status = 'failed';
      payment.metadata = stkCallback;
      await payment.save();

      console.log(`❌ Payment ${payment._id} failed. Code: ${resultCode}. Project remains payment_pending.`);
    }

    // Always return 200 to M-Pesa
    res.json({ success: true });
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(200).json({ success: true }); // Still return 200
  }
});

// ─── Get Payment by Project ID ────────────────────────────────────────────────
// ✅ NEW: Frontend needs this to find paymentId for release/status checks
router.get('/project/:projectId', requireAuth, async (req: RequestWithUser, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const payment = await Payment.findOne({
      project: req.params.projectId,
      status: { $in: ['pending', 'held', 'released'] },
    })
      .populate('project', 'title status')
      .populate('designer', 'name avatar')
      .sort({ createdAt: -1 });

    if (!payment) {
      return res.json({ success: true, payment: null });
    }

    // Only client, designer, or admin can see payment
    const isClient = payment.client.toString() === user._id.toString();
    const isDesigner = payment.designer._id
      ? payment.designer._id.toString() === user._id.toString()
      : payment.designer.toString() === user._id.toString();

    if (!isClient && !isDesigner && !user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error('Get payment by project error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment' });
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

    const isClient = payment.client.toString() === user._id.toString();
    if (!isClient && !user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Only client can release payment' });
    }

    if (payment.status !== 'held') {
      return res.status(400).json({
        success: false,
        error: `Cannot release payment with status: ${payment.status}`,
      });
    }

    const designer = await User.findById(payment.designer);
    if (!designer || !designer.phone) {
      return res.status(400).json({
        success: false,
        error: 'Designer phone number not found',
      });
    }

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
        error: `Cannot refund payment with status: ${payment.status}`,
      });
    }

    const client = await User.findById(payment.client);
    if (!client || !client.phone) {
      return res.status(400).json({
        success: false,
        error: 'Client phone number not found',
      });
    }

    try {
      const refundResponse = await mpesaService.b2cPayment(
        client.phone,
        payment.amount,
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
    const payments = await Payment.find({
      $or: [{ client: user._id }, { designer: user._id }],
    })
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