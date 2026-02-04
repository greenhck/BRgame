import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { LogOut, Settings, Users, DollarSign, Trophy, Upload } from 'lucide-react';
import { PLAYERS_DATA } from '../data/players';

const AdminDashboard = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('settings');
  const [settings, setSettings] = useState({
    signupEnabled: true,
    loginEnabled: true,
    teamEditEnabled: true,
    leaderboardPublic: false,
    teamsPublic: false
  });
  const [players, setPlayers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [qrFile, setQrFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data());
      }

      const playersSnapshot = await getDocs(collection(db, 'players'));
      setPlayers(playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const paymentsSnapshot = await getDocs(collection(db, 'payments'));
      setPayments(paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const usersSnapshot = await getDocs(collection(db, 'users'));
      setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      setTeams(teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSettingToggle = async (setting) => {
    const newValue = !settings[setting];
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        ...settings,
        [setting]: newValue
      });
      setSettings({ ...settings, [setting]: newValue });
      toast.success(`${setting} ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  const handleQRUpload = async () => {
    if (!qrFile) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const storageRef = ref(storage, `qr-codes/${Date.now()}_${qrFile.name}`);
      await uploadBytes(storageRef, qrFile);
      const url = await getDownloadURL(storageRef);

      await setDoc(doc(db, 'settings', 'payment'), { qrCodeUrl: url });
      toast.success('QR code uploaded successfully');
      setQrFile(null);
    } catch (error) {
      toast.error('Failed to upload QR code');
    }
    setLoading(false);
  };

  const handlePaymentApproval = async (paymentId, userId, approve) => {
    try {
      if (approve) {
        await updateDoc(doc(db, 'users', userId), { paymentApproved: true });
        await updateDoc(doc(db, 'payments', paymentId), { status: 'approved' });
        toast.success('Payment approved');
      } else {
        await updateDoc(doc(db, 'payments', paymentId), { status: 'rejected' });
        toast.success('Payment rejected');
      }
      fetchAllData();
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const initializePlayers = async () => {
    setLoading(true);
    try {
      for (const [country, playerNames] of Object.entries(PLAYERS_DATA)) {
        for (const playerName of playerNames) {
          const playerId = `${country}_${playerName}`.replace(/\s+/g, '_').toLowerCase();
          await setDoc(doc(db, 'players', playerId), {
            name: playerName,
            country: country,
            price: 5,
            points: 0
          });
        }
      }
      toast.success('Players initialized successfully');
      fetchAllData();
    } catch (error) {
      toast.error('Failed to initialize players');
    }
    setLoading(false);
  };

  const updatePlayerPrice = async (playerId, newPrice) => {
    try {
      const price = parseFloat(newPrice) || 0;
      await updateDoc(doc(db, 'players', playerId), { price });
      
      // Update local state immediately
      setPlayers(players.map(p => 
        p.id === playerId ? { ...p, price } : p
      ));
      
      toast.success('Price updated');
    } catch (error) {
      toast.error('Failed to update price');
      console.error(error);
    }
  };

  const updatePlayerPoints = async (playerId, newPoints) => {
    try {
      const points = parseFloat(newPoints) || 0;
      await updateDoc(doc(db, 'players', playerId), { points });
      
      // Update local state immediately
      setPlayers(players.map(p => 
        p.id === playerId ? { ...p, points } : p
      ));
      
      toast.success('Points updated - user teams will auto-update');
    } catch (error) {
      toast.error('Failed to update points');
      console.error(error);
    }
  };

  const calculateTeamPoints = (teamData) => {
    if (!teamData || !teamData.players) return 0;
    
    let total = 0;
    teamData.players.forEach(selection => {
      const player = players.find(p => p.id === selection.playerId);
      if (player && player.points !== undefined) {
        let points = player.points;
        if (selection.playerId === teamData.captain) {
          points *= 2;
        } else if (selection.playerId === teamData.viceCaptain) {
          points *= 1.5;
        }
        total += points;
      }
    });
    return total;
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-yellow-500 mr-2" />
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 mt-6">
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          {['settings', 'players', 'payments', 'users', 'teams'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-semibold capitalize ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Settings className="w-6 h-6 mr-2" />
                General Settings
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold">User Signup</h3>
                    <p className="text-sm text-gray-600">Allow new users to register</p>
                  </div>
                  <button
                    onClick={() => handleSettingToggle('signupEnabled')}
                    className={`px-6 py-2 rounded-lg font-semibold ${
                      settings.signupEnabled
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {settings.signupEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold">Team Editing</h3>
                    <p className="text-sm text-gray-600">Allow users to edit their teams</p>
                  </div>
                  <button
                    onClick={() => handleSettingToggle('teamEditEnabled')}
                    className={`px-6 py-2 rounded-lg font-semibold ${
                      settings.teamEditEnabled
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {settings.teamEditEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold">Public Leaderboard</h3>
                    <p className="text-sm text-gray-600">Show leaderboard to non-logged-in users</p>
                  </div>
                  <button
                    onClick={() => handleSettingToggle('leaderboardPublic')}
                    className={`px-6 py-2 rounded-lg font-semibold ${
                      settings.leaderboardPublic
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {settings.leaderboardPublic ? 'Public' : 'Private'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold">Public Teams View</h3>
                    <p className="text-sm text-gray-600">Show all user teams to public</p>
                  </div>
                  <button
                    onClick={() => handleSettingToggle('teamsPublic')}
                    className={`px-6 py-2 rounded-lg font-semibold ${
                      settings.teamsPublic
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {settings.teamsPublic ? 'Public' : 'Private'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Upload className="w-6 h-6 mr-2" />
                Payment QR Code
              </h2>
              
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setQrFile(e.target.files[0])}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleQRUpload}
                  disabled={loading || !qrFile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Players Management</h2>
              <button
                onClick={initializePlayers}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Initializing...' : 'Initialize All Players'}
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Player</th>
                    <th className="px-4 py-2 text-left">Country</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">Points</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => (
                    <tr key={player.id} className="border-t">
                      <td className="px-4 py-2">{player.name}</td>
                      <td className="px-4 py-2">{player.country}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={player.price || 0}
                          onChange={(e) => {
                            const newPrice = e.target.value;
                            setPlayers(players.map(p => 
                              p.id === player.id ? { ...p, price: parseFloat(newPrice) || 0 } : p
                            ));
                          }}
                          onBlur={(e) => updatePlayerPrice(player.id, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={player.points || 0}
                          onChange={(e) => {
                            const newPoints = e.target.value;
                            setPlayers(players.map(p => 
                              p.id === player.id ? { ...p, points: parseFloat(newPoints) || 0 } : p
                            ));
                          }}
                          onBlur={(e) => updatePlayerPoints(player.id, e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-xs text-gray-500">Auto-save</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <DollarSign className="w-6 h-6 mr-2" />
              Payment Approvals
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">User</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Transaction ID</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment.id} className="border-t">
                      <td className="px-4 py-2">{payment.userName}</td>
                      <td className="px-4 py-2">{payment.userEmail}</td>
                      <td className="px-4 py-2">{payment.transactionId}</td>
                      <td className="px-4 py-2 text-right">₹{payment.amount}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-sm ${
                          payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                          payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {payment.status === 'pending' && (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handlePaymentApproval(payment.id, payment.userId, true)}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handlePaymentApproval(payment.id, payment.userId, false)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2" />
              Users Management
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Role</th>
                    <th className="px-4 py-2 text-left">Payment Status</th>
                    <th className="px-4 py-2 text-left">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-t">
                      <td className="px-4 py-2">{user.name}</td>
                      <td className="px-4 py-2">{user.email}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-sm ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-sm ${
                          user.paymentApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.paymentApproved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-2">{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Trophy className="w-6 h-6 mr-2" />
              All Teams & Leaderboard
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Rank</th>
                    <th className="px-4 py-2 text-left">User</th>
                    <th className="px-4 py-2 text-left">Team Name</th>
                    <th className="px-4 py-2 text-right">Total Points</th>
                    <th className="px-4 py-2 text-right">Players</th>
                  </tr>
                </thead>
                <tbody>
                  {teams
                    .map(team => ({
                      ...team,
                      totalPoints: calculateTeamPoints(team),
                      userName: users.find(u => u.id === team.userId)?.name || 'Unknown'
                    }))
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .map((team, idx) => (
                      <tr key={team.id} className="border-t">
                        <td className="px-4 py-2 font-semibold">{idx + 1}</td>
                        <td className="px-4 py-2">{team.userName}</td>
                        <td className="px-4 py-2">{team.teamName}</td>
                        <td className="px-4 py-2 text-right font-semibold">{team.totalPoints.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right">{team.players?.length || 0}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
