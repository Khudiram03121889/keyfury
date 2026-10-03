import React from 'react';
import { KeyFury3DThunderScene } from './KeyFury3DThunderScene';

export interface KeyFurySplashScreenProps {
  onComplete: () => void;
  durationSeconds?: number;
}

export const KeyFurySplashScreen: React.FC<KeyFurySplashScreenProps> = ({
  onComplete,
  durationSeconds = 5.0,
}) => {
  return (
    <KeyFury3DThunderScene
      durationSeconds={durationSeconds}
      onComplete={onComplete}
      isOverlay={false}
      allowSkip={true}
    />
  );
};

export default KeyFurySplashScreen;
