const mongoose = require('mongoose');

const ChurchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    subaccountCode: { type: String, required: true }, // Paystack subaccount for split payments
    bankName: { type: String },
    accountNumber: { type: String },
    phoneNumber: { type: String }, // e.g., MTN MoMo number
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Church', ChurchSchema);
