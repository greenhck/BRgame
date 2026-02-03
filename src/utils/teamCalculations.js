export const calculateTeamPoints = (team, playersData) => {
  if (!team || !team.players || !playersData) return 0;
  
  let totalPoints = 0;
  
  team.players.forEach(playerSelection => {
    const player = playersData.find(p => p.id === playerSelection.playerId);
    if (player && player.points !== undefined) {
      let points = player.points;
      
      if (playerSelection.playerId === team.captain) {
        points *= 2;
      } else if (playerSelection.playerId === team.viceCaptain) {
        points *= 1.5;
      }
      
      totalPoints += points;
    }
  });
  
  return totalPoints;
};

export const calculateRemainingBudget = (selectedPlayers, playersData) => {
  const totalSpent = selectedPlayers.reduce((sum, selection) => {
    const player = playersData.find(p => p.id === selection.playerId);
    return sum + (player?.price || 0);
  }, 0);
  
  return 100 - totalSpent;
};
