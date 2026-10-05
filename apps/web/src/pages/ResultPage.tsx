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
  onRematchStart?: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  room,
  guest,
  matchResult,
  userProfile,
  onReturnToLobby,
  onOpenProfile,
  onRematchStart
}) => {
  const isWinner = matchResult?.winnerSessionId === room.sessionId;

  const [rematchStatus, setRematchStatus] = useState<'idle' | 'pending' | 'received' | 'accepted' | 'dismissed'>('idle');
  const [rematchRequesterName, setRematchRequesterName] = useState<string>('');
  const [dismissReason, setDismissReason] = useState<string>('');

  useEffect(() => {
    if (!room) return;

    room.onStateChange((state: any) => {
      if (state.status === 'countdown' || state.status === 'in_progress') {
        onRematchStart?.();
      }
    });

    room.onMessage('server_event', (event: any) => {
      if (event.type === 'rematch_request') {
        if (event.requesterSessionId !== room.sessionId) {
          setRematchStatus('received');
          setRematchRequesterName(event.requesterDisplayName || 'Opponent');
        }
      } else if (event.type === 'rematch_dismissed') {
        setRematchStatus('dismissed');
        setDismissReason(event.reason || 'declined');
        setTimeout(() => {
          setRematchStatus('idle');
        }, 3500);
      } else if (event.type === 'match_start') {
        onRematchStart?.();
      }
    });
  }, [room, onRematchStart]);

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

  let calculatedMmrDelta = 0;
  let calculatedNewMmr: number | undefined = undefined;

  if (matchResult?.mmrDeltas && matchResult.mmrDeltas[room.sessionId]) {
    calculatedMmrDelta = matchResult.mmrDeltas[room.sessionId].delta;
    calculatedNewMmr = matchResult.mmrDeltas[room.sessionId].newMmr;
  } else if (myRawStats?.mmrDelta !== undefined || myRawStats?.mmr_delta !== undefined) {
    calculatedMmrDelta = myRawStats?.mmrDelta ?? myRawStats?.mmr_delta ?? (isWinner ? 24 : -16);
    calculatedNewMmr = myRawStats?.newMmr ?? myRawStats?.new_mmr ?? (typeof myRawStats?.mmr === 'number' ? myRawStats.mmr : Math.max(0, (userProfile?.mmr ?? 1000) + calculatedMmrDelta));
  } else {
    calculatedMmrDelta = isWinner ? 24 : -16;
    if (typeof myRawStats?.mmr === 'number') {
      calculatedNewMmr = myRawStats.mmr;
    } else {
      const baseMmr = typeof userProfile?.mmr === 'number' ? userProfile.mmr : 1000;
      calculatedNewMmr = Math.max(0, baseMmr + calculatedMmrDelta);
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
    mmrDelta: calculatedMmrDelta,
    newMmr: calculatedNewMmr
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

  const handleRequestRematch = () => {
    soundManager.playClick();
    setRematchStatus('pending');
    try {
      room.send('rematch_vote', { accepted: true });
    } catch (_e) {}
  };

  const handleAcceptRematch = () => {
    soundManager.playClick();
    setRematchStatus('pending');
    try {
      room.send('rematch_vote', { accepted: true });
    } catch (_e) {}
  };

  const handleDeclineRematch = () => {
    soundManager.playClick();
    setRematchStatus('idle');
    try {
      room.send('rematch_vote', { accepted: false });
    } catch (_e) {}
  };

  return (
    <PostMatchScreen
      isWinner={isWinner}
      playerStats={playerStats}
      opponentStats={opponentStats}
      userProfile={userProfile || (guest as any)}
      onPlayAgain={handleRequestRematch}
      onReturnToLobby={onReturnToLobby}
      onViewProfile={onOpenProfile}
      rematchStatus={rematchStatus}
      rematchRequesterName={rematchRequesterName}
      dismissReason={dismissReason}
      onAcceptRematch={handleAcceptRematch}
      onDeclineRematch={handleDeclineRematch}
    />
  );
};

export default ResultPage;
