import { getHeroArt } from './HeroArt';

import modifierPlus1 from '../ui/assets/cards/modifier/modifier+1.png';
import modifierPlus2 from '../ui/assets/cards/modifier/modifier+2.png';
import modifierPlus3 from '../ui/assets/cards/modifier/modifier+3.png';
import modifierPlus4 from '../ui/assets/cards/modifier/modifier+4.png';
import modifierMinus4 from '../ui/assets/cards/modifier/modifier-4.png';

import callToTheFallen from '../ui/assets/cards/magic/call of the fallen.png';
import criticalBoost from '../ui/assets/cards/magic/critical boost.png';
import destructiveSpell from '../ui/assets/cards/magic/destructive spell.png';
import enchantedSpell from '../ui/assets/cards/magic/enchanted spell.png';
import entanglingTrap from '../ui/assets/cards/magic/entangling trap.png';
import forcedExchange from '../ui/assets/cards/magic/forced exchange.png';
import forcefulWinds from '../ui/assets/cards/magic/forceful winds.png';
import windsOfChange from '../ui/assets/cards/magic/winds of change.png';

import abyssQueen from '../ui/assets/monster/abyss queen.png';
import anuranCauldron from '../ui/assets/monster/anuran cauldron.png';
import articAries from '../ui/assets/monster/artic aries.png';
import bloodwing from '../ui/assets/monster/bloodwing.png';
import corruptedSabretooth from '../ui/assets/monster/corrupted sabretooth.png';
import crownedSerpent from '../ui/assets/monster/crowned serpent.png';
import darkDragonKing from '../ui/assets/monster/dark dragon king.png';
import dracos from '../ui/assets/monster/dracos.png';
import malamammoth from '../ui/assets/monster/malamammoth.png';
import megaSlime from '../ui/assets/monster/mega slime.png';
import orthus from '../ui/assets/monster/orthus.png';
import rexMajor from '../ui/assets/monster/rex major.png';
import terratuga from '../ui/assets/monster/terratuga.png';
import titanWyvern from '../ui/assets/monster/titan wyvern.png';
import warwornOwlbear from '../ui/assets/monster/warworn owlbear.png';

const MODIFIER_ART: Record<string, string> = {
    'Modifier +1/-3': modifierPlus1,
    'Modifier +2/-2': modifierPlus2,
    'Modifier +3/-1': modifierPlus3,
    'Modifier +4': modifierPlus4,
    'Modifier -4': modifierMinus4,
};

const MAGIC_ART: Record<string, string> = {
    'Call to the Fallen': callToTheFallen,
    'Critical Boost': criticalBoost,
    'Destructive Spell': destructiveSpell,
    'Enchanted Spell': enchantedSpell,
    'Entangling Trap': entanglingTrap,
    'Forced Exchange': forcedExchange,
    'Forceful Winds': forcefulWinds,
    'Winds of Change': windsOfChange,
};

const MONSTER_ART: Record<string, string> = {
    'Abyss Queen': abyssQueen,
    'Anuran Cauldron': anuranCauldron,
    'Artic Aries': articAries,
    'Bloodwing': bloodwing,
    'Corrupted Sabretooth': corruptedSabretooth,
    'Crowned Serpent': crownedSerpent,
    'Dark Dragon King': darkDragonKing,
    'Dracos': dracos,
    'Malamammoth': malamammoth,
    'Mega Slime': megaSlime,
    'Orthus': orthus,
    'Rex Major': rexMajor,
    'Terratuga': terratuga,
    'Titan Wyvern': titanWyvern,
    'Warworn Owlbear': warwornOwlbear,
};

export function getMonsterArt(monsterName?: string): string | undefined {
    if (!monsterName) return undefined;
    return MONSTER_ART[monsterName];
}

export function getModifierArt(cardName?: string): string | undefined {
    if (!cardName) return undefined;
    return MODIFIER_ART[cardName];
}

export function getMagicArt(cardName?: string): string | undefined {
    if (!cardName) return undefined;
    return MAGIC_ART[cardName];
}

/** Resolves the art for any card type (HERO, MAGIC, MODIFIER), regardless of which is passed. */
export function getCardArt(card: { type?: string; cardName?: string; heroClass?: string }): string | undefined {
    if (card.type === 'MAGIC') return getMagicArt(card.cardName);
    if (card.type === 'MODIFIER') return getModifierArt(card.cardName);
    return getHeroArt(card.heroClass, card.cardName) || undefined;
}
