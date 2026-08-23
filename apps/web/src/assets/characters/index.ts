import shadowRoninSvg from './shadow-ronin.svg';
import cyberValkyrieSvg from './cyber-valkyrie.svg';
import voltShinobiSvg from './volt-shinobi.svg';
import voidAssassinSvg from './void-assassin.svg';
import type { CharacterId } from '@keyfury/game-core';

export const CHARACTER_PORTRAITS: Record<CharacterId, string> = {
  shadow_ronin: shadowRoninSvg,
  cyber_valkyrie: cyberValkyrieSvg,
  volt_shinobi: voltShinobiSvg,
  void_assassin: voidAssassinSvg
};

export {
  shadowRoninSvg,
  cyberValkyrieSvg,
  voltShinobiSvg,
  voidAssassinSvg
};
