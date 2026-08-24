import highlandSanctuaryUrl from './highland_sanctuary.jpg';
import cyberRooftopUrl from './cyber_rooftop.jpg';
import volcanicCalderaUrl from './volcanic_caldera.jpg';
import celestialVoidUrl from './celestial_void.jpg';
import type { ArenaId } from '@keyfury/game-core';

export const ARENA_BACKGROUNDS: Record<ArenaId, string> = {
  highland_sanctuary: highlandSanctuaryUrl,
  cyber_rooftop: cyberRooftopUrl,
  volcanic_caldera: volcanicCalderaUrl,
  celestial_void: celestialVoidUrl,
};

export {
  highlandSanctuaryUrl,
  cyberRooftopUrl,
  volcanicCalderaUrl,
  celestialVoidUrl,
};
