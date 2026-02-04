import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle } from 'lucide-react';

const Payment = () => {
  const { currentUser, userProfile } = useAuth();
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        const qrDoc = await getDoc(doc(db, 'settings', 'payment'));
        if (qrDoc.exists()) {
          setQrCode(qrDoc.data().qrCodeUrl || '');
        }
      } catch (error) {
        console.error('Error fetching QR code:', error);
      } finally {
        // Always set loading to false, even if fetch fails
        setTimeout(() => setPageLoading(false), 500);
      }
    };
    fetchQRCode();
  }, []);

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (amount !== '350') {
      toast.error('Amount must be ₹350');
      return;
    }
    
    setLoading(true);
    try {
      await setDoc(doc(db, 'payments', currentUser.uid), {
        userId: currentUser.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
        transactionId,
        amount: parseInt(amount),
        status: 'pending',
        submittedAt: new Date().toISOString()
      });
      
      toast.success('Payment details submitted! Waiting for admin approval.');
      setTransactionId('');
      setAmount('');
    } catch (error) {
      console.error('Payment submission error:', error);
      toast.error('Failed to submit payment details: ' + error.message);
    }
    setLoading(false);
  };

  if (userProfile?.paymentApproved) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Approved!</h2>
          <p className="text-gray-600">Your payment has been approved. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-6">
            <CreditCard className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-800">Complete Payment</h1>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-lg font-semibold text-gray-800">Entry Fee: ₹350</p>
                <p className="text-sm text-gray-600 mt-2">
                  Free for up to 50 users, then ₹350 per user
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Instructions:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Scan the QR code to make payment</li>
                  <li>Enter the transaction ID below</li>
                  <li>Enter the amount (₹350)</li>
                  <li>Submit for admin approval</li>
                  <li>Wait for approval to access the game</li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Need Help with Payment?
                </h3>
                <p className="text-sm text-blue-800 mb-2">
                  Contact us on Telegram for payment assistance:
                </p>
                <a
                  href="https://t.me/lovelyakash41"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  @lovelyakash41
                </a>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">Scan QR Code</h2>
              <div className="bg-gray-100 p-4 rounded-lg mb-4 flex items-center justify-center h-64">
                {qrCode ? (
                  <img src={qrCode} alt="Payment QR Code" className="max-h-full" />
                ) : (
                  <div className="text-center">
                    <p className="text-gray-500 mb-2">QR Code not uploaded yet</p>
                    <p className="text-sm text-gray-400">Admin will upload payment QR code soon</p>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {loading ? 'Submitting...' : 'Submit Payment Details'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
