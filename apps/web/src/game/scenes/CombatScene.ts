// CombatScene wrapper & alias for Phaser fight rendering in KeyFury
import { StickFightScene, AttackKind, FighterState } from '../StickFightScene';

export class CombatScene extends StickFightScene {
  constructor() {
    super();
  }
}

export { StickFightScene };
export type { AttackKind, FighterState };
export default CombatScene;
