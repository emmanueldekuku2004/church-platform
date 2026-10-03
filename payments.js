const express = require('express');
const router = express.Router();
const axios = require('axios');

// ==========================================
// 1. BACKEND ROUTE: Initialize Payment Split
// ==========================================
router.post('/initialize', async (req, res) => {
    try {
        const { amount, customerEmail } = req.body; // amount in pesewas

        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        // Your account configuration details
        const paymentPayload = {
            email: customerEmail || "supporter@gracechapel.com", 
            amount: amount,
            currency: 'GHS',
            subaccount: "ACCT_powurnu46rvz2m1",
            transaction_charge: Math.round(amount * 0.02), 
            bearer: 'account',
            metadata: {
                bank_name: 'Guaranty Trust Bank (GTBank Ghana)',
                account_name: 'Emmanuel Antwi Dekuku',
                momo_number: '+233598369212'
            }
        };

        // Request to Paystack API to initialize the transaction
        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            paymentPayload,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.status(200).json({
            success: true,
            authorization_url: response.data.data.authorization_url,
            reference: response.data.data.reference
        });

    } catch (err) {
        console.error('Payment Initialization Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to initialize payment split' });
    }
});


// ==========================================
// 2. BACKEND ROUTE: Verify Transaction
// ==========================================
router.get('/verify/:reference', async (req, res) => {
    try {
        const { reference } = req.params;

        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
            }
        });

        const txData = response.data.data;

        const paymentDetails = {
            status: txData.status, 
            amount: txData.amount / 100, // Convert back from pesewas to GHS
            currency: txData.currency,
            channel: txData.channel, 
            network: txData.authorization.bank, 
            senderPhone: txData.customer.phone || 'N/A',
            senderEmail: txData.customer.email,
            paidAt: txData.paid_at
        };

        console.log('Payment Verified Successfully:', paymentDetails);

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            data: paymentDetails
        });

    } catch (err) {
        console.error('Payment Verification Error:', err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});


// ==========================================
// 3. FRONTEND HANDLER: Trigger Checkout
// ==========================================
/* 
   If this file is also loaded on your frontend browser side, 
   this function catches form submissions, talks to your backend, 
   and automatically redirects the user to Paystack's payment page.
*/
if (typeof window !== 'undefined') {
    window.handlePaymentSubmit = async function(event) {
        event.preventDefault();

        // Adjust these IDs to match your HTML form input IDs
        const amountInput = document.getElementById('amount-input').value;
        const emailInput = document.getElementById('email-input') ? document.getElementById('email-input').value : "supporter@gracechapel.com";

        if (!amountInput) {
            alert('Please enter a valid amount.');
            return;
        }

        // Paystack expects amount in pesewas (Multiply GHS by 100)
        const amountInPesewas = Math.round(parseFloat(amountInput) * 100);

        try {
            // Sends request to your Express backend route
            const res = await fetch('/api/payments/initialize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: amountInPesewas,
                    customerEmail: emailInput
                })
            });

            const data = await res.json();

            if (data.success && data.authorization_url) {
                // Redirects user straight to Paystack Mobile Money / Card checkout page
                window.location.href = data.authorization_url;
            } else {
                alert('Error: ' + (data.error || 'Could not initialize transaction'));
            }
        } catch (err) {
            console.error('Frontend Payment Request Error:', err);
            alert('Network error connecting to payment server.');
        }
    };
}

module.exports = router;