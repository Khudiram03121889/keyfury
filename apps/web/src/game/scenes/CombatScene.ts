// CombatScene wrapper & alias for Phaser fight rendering in KeyFury
import { StickFightScene, AttackKind, FighterState } from '../StickFightScene';
import {
  getCharacterDefinition,
  type CharacterDefinition,
  type CharacterId
} from '@keyfury/game-core';

export class CombatScene extends StickFightScene {
  constructor() {
    super();
  }
}

export { StickFightScene, getCharacterDefinition };
export type { AttackKind, FighterState, CharacterDefinition, CharacterId };
export default CombatScene;
