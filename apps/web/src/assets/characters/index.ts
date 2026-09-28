import shadowRonin3d from './shadow-ronin-3d.png';
import cyberValkyrie3d from './cyber-valkyrie-3d.png';
import voltShinobi3d from './volt-shinobi-3d.png';
import voidAssassin3d from './void-assassin-3d.png';
import type { CharacterId } from '@keyfury/game-core';

export const CHARACTER_PORTRAITS: Record<CharacterId, string> = {
  shadow_ronin: shadowRonin3d,
  cyber_valkyrie: cyberValkyrie3d,
  volt_shinobi: voltShinobi3d,
  void_assassin: voidAssassin3d
};

export {
  shadowRonin3d,
  cyberValkyrie3d,
  voltShinobi3d,
  voidAssassin3d,
  shadowRonin3d as shadowRoninSvg,
  cyberValkyrie3d as cyberValkyrieSvg,
  voltShinobi3d as voltShinobiSvg,
  voidAssassin3d as voidAssassinSvg
};

