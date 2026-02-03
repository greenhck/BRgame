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
