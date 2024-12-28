const express = require('express');
const QRCode = require('qrcode');
const { protect } = require('../middleware');
const User = require('../models/User');
const Booking = require('../models/Booking');

const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const newUser = new User({ name, email, password });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ error: 'User registration failed', details: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && user.password === password) {
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token, message: 'Login successful' });
  } else {
    res.status(400).json({ message: 'Invalid credentials' });
  }
});

// Fetch balance
router.get('/balance', protect, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    res.json({ balance: user.balance });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// UPI QR Code generation
router.get('/upi-qrcode', protect, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    const upiId = `${user.email}@wallet`;
    const qrCodeData = `upi://pay?pa=${upiId}&pn=${user.name}&cu=INR`;
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);
    res.json({ qrCode: qrCodeImage });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

// Train ticket booking
router.post('/book-ticket', protect, async (req, res) => {
  const { trainName, ticketCount, costPerTicket } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const totalCost = ticketCount * costPerTicket;

  if (user.balance < totalCost) {
    return res.status(400).json({ message: 'Insufficient balance' });
  }

  const booking = new Booking({
    user: user._id,
    trainName,
    ticketCount,
    totalCost,
  });

  user.balance -= totalCost;
  await user.save();
  await booking.save();

  res.json({ message: 'Ticket booked successfully', booking });
});

module.exports = router;
