import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ArrowLeft, Users } from 'lucide-react';

const CreateTeam = () => {
  const { currentUser } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [captain, setCaptain] = useState('');
  const [viceCaptain, setViceCaptain] = useState('');
  const [filterCountry, setFilterCountry] = useState('All');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const countries = ['All', 'India', 'Australia', 'Sri Lanka', 'Zimbabwe', 'Ireland', 
                     'England', 'West Indies', 'South Africa', 'New Zealand', 'Afghanistan'];

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    try {
      const playersSnapshot = await getDocs(collection(db, 'players'));
      const playersData = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(playersData);

      const teamDoc = await getDoc(doc(db, 'teams', currentUser.uid));
      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        setTeamName(teamData.teamName);
        setSelectedPlayers(teamData.players || []);
        setCaptain(teamData.captain || '');
        setViceCaptain(teamData.viceCaptain || '');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const getRemainingBudget = () => {
    const spent = selectedPlayers.reduce((sum, selection) => {
      const player = players.find(p => p.id === selection.playerId);
      return sum + (player?.price || 0);
    }, 0);
    return 100 - spent;
  };

  const handlePlayerToggle = (player) => {
    const isSelected = selectedPlayers.some(s => s.playerId === player.id);
    
    if (isSelected) {
      setSelectedPlayers(selectedPlayers.filter(s => s.playerId !== player.id));
      if (captain === player.id) setCaptain('');
      if (viceCaptain === player.id) setViceCaptain('');
    } else {
      if (selectedPlayers.length >= 11) {
        toast.error('You can only select 11 players');
        return;
      }
      
      if (getRemainingBudget() < player.price) {
        toast.error('Insufficient budget');
        return;
      }
      
      setSelectedPlayers([...selectedPlayers, { playerId: player.id }]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedPlayers.length !== 11) {
      toast.error('Please select exactly 11 players');
      return;
    }
    
    if (!captain || !viceCaptain) {
      toast.error('Please select captain and vice-captain');
      return;
    }
    
    if (captain === viceCaptain) {
      toast.error('Captain and vice-captain must be different');
      return;
    }
    
    setLoading(true);
    try {
      await setDoc(doc(db, 'teams', currentUser.uid), {
        userId: currentUser.uid,
        teamName,
        players: selectedPlayers,
        captain,
        viceCaptain,
        updatedAt: new Date().toISOString()
      });
      
      toast.success('Team saved successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to save team');
    }
    setLoading(false);
  };

  const filteredPlayers = filterCountry === 'All' 
    ? players 
    : players.filter(p => p.country === filterCountry);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-700 hover:text-gray-900 mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </button>
          <Users className="w-8 h-8 text-blue-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-800">Create Your Team</h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 mt-6">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="grid md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Remaining</label>
                <div className="px-4 py-2 bg-gray-100 rounded-lg font-semibold">
                  {getRemainingBudget()} / 100
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Players Selected</label>
                <div className="px-4 py-2 bg-gray-100 rounded-lg font-semibold">
                  {selectedPlayers.length} / 11
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Country</label>
                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Available Players</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPlayers.map(player => {
                  const isSelected = selectedPlayers.some(s => s.playerId === player.id);
                  return (
                    <div
                      key={player.id}
                      onClick={() => handlePlayerToggle(player)}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        isSelected 
                          ? 'bg-blue-100 border-2 border-blue-500' 
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{player.name}</p>
                          <p className="text-sm text-gray-600">{player.country}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-blue-600">{player.price} pts</p>
                          <p className="text-sm text-gray-600">{player.points || 0} scored</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Your Team</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Captain (2x points)</label>
                <select
                  value={captain}
                  onChange={(e) => setCaptain(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Captain</option>
                  {selectedPlayers.map(selection => {
                    const player = players.find(p => p.id === selection.playerId);
                    return player ? (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ) : null;
                  })}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vice Captain (1.5x points)</label>
                <select
                  value={viceCaptain}
                  onChange={(e) => setViceCaptain(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Vice Captain</option>
                  {selectedPlayers.map(selection => {
                    const player = players.find(p => p.id === selection.playerId);
                    return player ? (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ) : null;
                  })}
                </select>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {selectedPlayers.map(selection => {
                  const player = players.find(p => p.id === selection.playerId);
                  if (!player) return null;
                  
                  let badge = '';
                  if (player.id === captain) badge = '(C)';
                  else if (player.id === viceCaptain) badge = '(VC)';
                  
                  return (
                    <div key={player.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{player.name} {badge}</p>
                          <p className="text-sm text-gray-600">{player.country}</p>
                        </div>
                        <p className="font-semibold text-blue-600">{player.price} pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <button
                type="submit"
                disabled={loading || selectedPlayers.length !== 11}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
              >
                {loading ? 'Saving...' : 'Save Team'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeam;
