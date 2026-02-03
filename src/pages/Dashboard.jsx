import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { LogOut, Users, Trophy, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teamEditEnabled, setTeamEditEnabled] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      if (settingsDoc.exists()) {
        setTeamEditEnabled(settingsDoc.data().teamEditEnabled !== false);
      }

      const playersSnapshot = await getDocs(collection(db, 'players'));
      const playersData = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(playersData);

      const teamDoc = await getDoc(doc(db, 'teams', currentUser.uid));
      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        const teamPoints = calculateTeamPoints(teamData, playersData);
        setTeam({ ...teamData, totalPoints: teamPoints });
      }

      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersMap = {};
      usersSnapshot.docs.forEach(doc => {
        usersMap[doc.id] = doc.data().name;
      });

      const leaderboardData = teamsSnapshot.docs.map(doc => {
        const teamData = doc.data();
        return {
          userId: doc.id,
          userName: usersMap[doc.id] || 'Unknown',
          teamName: teamData.teamName,
          points: calculateTeamPoints(teamData, playersData)
        };
      }).sort((a, b) => b.points - a.points);

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const calculateTeamPoints = (teamData, playersData) => {
    if (!teamData || !teamData.players) return 0;
    
    let total = 0;
    teamData.players.forEach(selection => {
      const player = playersData.find(p => p.id === selection.playerId);
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

  const getPlayerDetails = (playerId) => {
    return players.find(p => p.id === playerId);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-yellow-500 mr-2" />
            <h1 className="text-2xl font-bold text-gray-800">Auction Game</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">{userProfile?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 mt-6">
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Team</h3>
            <p className="text-3xl font-bold text-blue-600">
              {team ? team.teamName : 'Not Created'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Points</h3>
            <p className="text-3xl font-bold text-green-600">
              {team ? team.totalPoints.toFixed(1) : '0'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Your Rank</h3>
            <p className="text-3xl font-bold text-purple-600">
              {leaderboard.findIndex(t => t.userId === currentUser.uid) + 1 || '-'}
            </p>
          </div>
        </div>

        {!team ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Create Your Team</h2>
            <p className="text-gray-600 mb-6">
              Build your dream team of 11 players with a budget of 100 points
            </p>
            <button
              onClick={() => navigate('/create-team')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Team
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Your Team: {team.teamName}</h2>
              {teamEditEnabled && (
                <button
                  onClick={() => navigate('/create-team')}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Team
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Player</th>
                    <th className="px-4 py-2 text-left">Country</th>
                    <th className="px-4 py-2 text-left">Role</th>
                    <th className="px-4 py-2 text-right">Points</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {team.players.map((selection, idx) => {
                    const player = getPlayerDetails(selection.playerId);
                    if (!player) return null;
                    
                    let multiplier = 1;
                    let role = '';
                    if (selection.playerId === team.captain) {
                      multiplier = 2;
                      role = '(C)';
                    } else if (selection.playerId === team.viceCaptain) {
                      multiplier = 1.5;
                      role = '(VC)';
                    }
                    
                    return (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2">{player.name} {role}</td>
                        <td className="px-4 py-2">{player.country}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {multiplier > 1 ? `${multiplier}x` : ''}
                        </td>
                        <td className="px-4 py-2 text-right">{player.points || 0}</td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {((player.points || 0) * multiplier).toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Leaderboard</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Rank</th>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Team Name</th>
                  <th className="px-4 py-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr 
                    key={entry.userId} 
                    className={`border-t ${entry.userId === currentUser.uid ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-2 font-semibold">{idx + 1}</td>
                    <td className="px-4 py-2">{entry.userName}</td>
                    <td className="px-4 py-2">{entry.teamName}</td>
                    <td className="px-4 py-2 text-right font-semibold">{entry.points.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
