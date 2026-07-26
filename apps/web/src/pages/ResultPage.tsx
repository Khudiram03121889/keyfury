import React, { useState, useEffect } from 'react';
import { Room } from 'colyseus.js';
import { GuestProfile, UserProfile } from '../lib/supabase';
import { soundManager } from '../audio/SoundManager';
import { PostMatchScreen, MatchPlayerStats } from '../components/ranked/PostMatchScreen';

interface ResultPageProps {
  room: Room;
  guest: GuestProfile;
  matchResult: any;
  userProfile?: UserProfile | null;
  onReturnToLobby: () => void;
  onOpenProfile?: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  room,
  guest,
  matchResult,
  userProfile,
  onReturnToLobby,
  onOpenProfile
}) => {
  const isWinner = matchResult?.winnerSessionId === room.sessionId;

  let myRawStats: any = null;
  let oppRawStats: any = null;

  if (matchResult?.players) {
    if (typeof matchResult.players.forEach === 'function') {
      matchResult.players.forEach((p: any, sId: string) => {
        if (sId === room.sessionId) myRawStats = p;
        else oppRawStats = p;
      });
    } else {
      Object.keys(matchResult.players).forEach((sId) => {
        if (sId === room.sessionId) myRawStats = matchResult.players[sId];
        else oppRawStats = matchResult.players[sId];
      });
    }
  }

  const playerStats: MatchPlayerStats = {
    displayName: userProfile?.displayName || guest.displayName,
    avatarUrl: userProfile?.avatarUrl || guest.avatarUrl,
    wpm: myRawStats?.acceptedWpm ?? myRawStats?.accepted_wpm ?? 0,
    accuracy: myRawStats?.accuracy ?? 0,
    maxCombo: myRawStats?.highestCombo ?? myRawStats?.highest_combo ?? 0,
    finalHealth: myRawStats?.health ?? myRawStats?.final_health ?? (isWinner ? 100 : 0),
    wordsCompleted: myRawStats?.wordsCompleted ?? myRawStats?.words_completed ?? 0,
    mmrDelta: myRawStats?.mmrDelta ?? myRawStats?.elo_delta ?? (userProfile && !userProfile.isGuest ? (isWinner ? 25 : -15) : 0)
  };

  const opponentStats: MatchPlayerStats = {
    displayName: oppRawStats?.displayName || 'Opponent Warrior',
    avatarUrl: oppRawStats?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Opponent',
    wpm: oppRawStats?.acceptedWpm ?? oppRawStats?.accepted_wpm ?? 0,
    accuracy: oppRawStats?.accuracy ?? 0,
    maxCombo: oppRawStats?.highestCombo ?? oppRawStats?.highest_combo ?? 0,
    finalHealth: oppRawStats?.health ?? oppRawStats?.final_health ?? (isWinner ? 0 : 100),
    wordsCompleted: oppRawStats?.wordsCompleted ?? oppRawStats?.words_completed ?? 0
  };

  const handleRematch = () => {
    soundManager.playClick();
    room.send('rematch_vote', { accepted: true });
    onReturnToLobby();
  };

  return (
    <PostMatchScreen
      isWinner={isWinner}
      playerStats={playerStats}
      opponentStats={opponentStats}
      userProfile={userProfile}
      onPlayAgain={handleRematch}
      onReturnToLobby={onReturnToLobby}
      onViewProfile={onOpenProfile}
    />
  );
};

export default ResultPage;
