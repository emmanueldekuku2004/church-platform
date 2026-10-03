require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Models
const Church = require('./models/Church');

// const sermonRoutes = require('./routes/sermons');
const paymentRoutes = require('./payments');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Ensure 'uploads' folder exists automatically and serve it publicly
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// --- User Authentication & Profile Schema ---
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  sermonNote: String
});
const User = mongoose.model('User', UserSchema);

// Save or Update Sermon Note in Cloud Database
app.post('/api/notes/save', async (req, res) => {
  try {
    const { email, noteText } = req.body;
    await User.findOneAndUpdate(
      { email: email || "emmanuel@example.com" },
      { sermonNote: noteText },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, message: "Note saved to cloud!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to save note" });
  }
});

// Fetch User Profile & Notes
app.get('/api/profile/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email }) || {
      username: "Anointed Emmanuel",
      email: "emmanueldekuku2004@gmail.com",
      sermonNote: ""
    };
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- Dynamic Church Profile Route ---
app.get('/api/profile', async (req, res) => {
    try {
        const church = await Church.findOne({ email: process.env.MERCHANT_EMAIL || "emmanueldekuku2004@gmail.com" });
        if (!church) {
            return res.status(404).json({ error: "Church profile not found" });
        }
        res.json(church);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// --- Register Routes ---
// app.use('/api/sermons', sermonRoutes);
app.use('/api/payments', paymentRoutes);

// Auto-seed default creator profile on startup
async function seedDefaultChurch() {
    try {
        const merchantEmail = process.env.MERCHANT_EMAIL || "emmanueldekuku2004@gmail.com";
        const existing = await Church.findOne({ email: merchantEmail });
        if (!existing) {
            await Church.create({
                name: "Emmanuel's Ministry Hub",
                email: merchantEmail,
                subaccountCode: process.env.SUBACCOUNT_CODE || "ACCT_pending",
                bankName: "Guaranty Trust Bank (GTBank Ghana)",
                accountNumber: "GTBank Account",
                phoneNumber: "+233598369212"
            });
            console.log("Default church profile seeded successfully!");
        }
    } catch (err) {
        console.error("Error seeding church profile:", err);
    }
}

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/church_hub';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB successfully');
    await seedDefaultChurch();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });