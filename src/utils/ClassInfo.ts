import bardIcon from '../ui/assets/class-icons/bard.png';
import fighterIcon from '../ui/assets/class-icons/warrior.png';
import guardianIcon from '../ui/assets/class-icons/guardian.png';
import rangerIcon from '../ui/assets/class-icons/ranger.png';
import thiefIcon from '../ui/assets/class-icons/thief.png';
import wizardIcon from '../ui/assets/class-icons/mage.png';

import bardLeader from '../ui/assets/party-leader/bard.png';
import fighterLeader from '../ui/assets/party-leader/fighter.png';
import guardianLeader from '../ui/assets/party-leader/guardian.png';
import rangerLeader from '../ui/assets/party-leader/ranger.png';
import thiefLeader from '../ui/assets/party-leader/thief.png';
import wizardLeader from '../ui/assets/party-leader/wizard.png';

export type HeroClassId = 'BARD' | 'FIGHTER' | 'GUARDIAN' | 'RANGER' | 'THIEF' | 'WIZARD';

export const CLASS_IDS: HeroClassId[] = ['BARD', 'FIGHTER', 'GUARDIAN', 'RANGER', 'THIEF', 'WIZARD'];

export interface ClassInfo {
    /** Card frame color, sampled from the card art borders. */
    color: string;
    /** Lighter variant for text and dots over the dark table. */
    tint: string;
    icon: string;
    leaderArt: string;
    leaderName: string;
}

export const CLASS_INFO: Record<HeroClassId, ClassInfo> = {
    BARD: {
        color: '#c4502e', tint: '#e0764f', icon: bardIcon, leaderArt: bardLeader,
        leaderName: 'The Charismatic Song',
    },
    FIGHTER: {
        color: '#97272c', tint: '#d9474f', icon: fighterIcon, leaderArt: fighterLeader,
        leaderName: 'The Fist of Reason',
    },
    GUARDIAN: {
        color: '#ebab22', tint: '#ebab22', icon: guardianIcon, leaderArt: guardianLeader,
        leaderName: 'The Protecting Horn',
    },
    RANGER: {
        color: '#215d3b', tint: '#4fae74', icon: rangerIcon, leaderArt: rangerLeader,
        leaderName: 'The Divine Arrow',
    },
    THIEF: {
        color: '#084e7b', tint: '#4f9fd8', icon: thiefIcon, leaderArt: thiefLeader,
        leaderName: 'The Shadow Claw',
    },
    WIZARD: {
        color: '#742e8b', tint: '#b77bd6', icon: wizardIcon, leaderArt: wizardLeader,
        leaderName: 'The Cloaked Sage',
    },
};

export function classInfo(id?: string | null): ClassInfo | undefined {
    if (!id) return undefined;
    return CLASS_INFO[id as HeroClassId];
}

/** Classes a player has in their party, Party Leader included (win condition: all 6). */
export function partyClasses(leader?: string, party?: Array<{ heroClass?: string; type?: string }>): Set<string> {
    const classes = new Set<string>();
    if (leader) classes.add(leader);
    (party || []).forEach((card) => {
        if (card.heroClass) classes.add(card.heroClass);
    });
    return classes;
}

/** Probability that 2d6 + bonus reaches at least `target`. */
export function chanceAtLeast(target: number, bonus = 0): number {
    let hits = 0;
    for (let a = 1; a <= 6; a++) {
        for (let b = 1; b <= 6; b++) {
            if (a + b + bonus >= target) hits++;
        }
    }
    return Math.round((hits / 36) * 100);
}

/** Probability that 2d6 + bonus lands at or below `target`. */
export function chanceAtMost(target: number, bonus = 0): number {
    let hits = 0;
    for (let a = 1; a <= 6; a++) {
        for (let b = 1; b <= 6; b++) {
            if (a + b + bonus <= target) hits++;
        }
    }
    return Math.round((hits / 36) * 100);
}

export const PLAYER_COLORS = ['#b77bd6', '#e8693f', '#4fae74', '#6fb4e8', '#ebab22', '#d9474f'];
