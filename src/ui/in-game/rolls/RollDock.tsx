import { useCallback } from 'react';
import { chanceAtLeast } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import { GameCard } from '../../common/GameCard';
import { DicePair, useLocalRoll } from '../../common/PipDie';
import type { CardData, PlayersMap } from '../../common/types';
import { RollRangeBar, TimerRing } from '../../common/Widgets';
import { ModifierChips, modifierSum, passiveBonus, type AppliedModifier } from './RollParts';

export interface HeroRollResult {
    raw: number;
    min: number;
    resolved: boolean;
}

interface RollDockProps {
    players: PlayersMap;
    me: string;
    rollerId: string;
    card: CardData | null;
    matchState: string;
    challengeFraction: number;
    challengeSeconds: number;
    canChallenge: boolean;
    result: HeroRollResult | null;
    mods: AppliedModifier[];
    onRoll: (sum: number) => void;
    onChallenge: () => void;
}

/** Hero effect rolls happen in a dock above the hand, so the table stays visible. */
function RollDock({ players, me, rollerId, card, matchState, challengeFraction, challengeSeconds, canChallenge, result, mods, onRoll, onChallenge }: RollDockProps) {
    const { t } = useI18n();
    const handleResult = useCallback((sum: number) => onRoll(sum), [onRoll]);
    const { dice, rolling, roll } = useLocalRoll(handleResult);
    const roller = players[rollerId];
    const isRoller = rollerId === me;
    const target = result?.min ?? card?.diceValue ?? 0;
    const passive = passiveBonus(players, rollerId);
    const total = result ? result.raw + passive.sum + modifierSum(mods, rollerId) : null;
    const challengeOpen = matchState === 'CHALLENGE_WINDOW' && challengeSeconds > 0.1;
    const canRoll = isRoller && matchState === 'WAITING_HERO_ROLL' && !result && !rolling && !dice;
    const success = total != null && target > 0 ? total >= target : null;

    let status: string;
    const rollerName = roller?.username ?? t.common.someone;
    if (challengeOpen) status = isRoller ? t.roll.waitingChallenges : t.roll.playedBy(rollerName);
    else if (result?.resolved) status = success ? t.roll.success : t.roll.fail;
    else if (result) status = t.roll.waitingMods;
    else if (isRoller) status = t.roll.rollToUse;
    else status = t.roll.willRoll(rollerName);

    return (
        <section className={`dock hts-rise ${success === true && result?.resolved ? 'dock--win' : ''} ${success === false && result?.resolved ? 'dock--fail' : ''}`} aria-label={t.roll.aria} aria-live="polite">
            {result?.resolved && success !== null && <span className="dock-result">{success ? t.roll.successStamp : t.roll.failStamp}</span>}
            {card && <GameCard card={card} width={86} />}
            <div className="dock-info">
                <span style={{ fontWeight: 800, fontSize: 15 }}>{isRoller ? t.common.you : rollerName} · {card?.cardName ?? t.roll.playedCard}</span>
                {target > 0 && (
                    <span className="hts-muted" style={{ fontSize: 13 }}>
                        {t.roll.needs(target, chanceAtLeast(target, passive.sum), passive.sum)}
                    </span>
                )}
                {target > 0 && <RollRangeBar zoneOf={(n) => (n + passive.sum >= target ? 'win' : 'mid')} mark={result ? result.raw : null} height={16} />}
                <span className="dock-status">{status}</span>
            </div>

            <div className="dock-dice">
                {result && !dice && !rolling ? (
                    <span className="hts-display hts-pop" style={{ fontSize: 46 }}>{result.raw}</span>
                ) : isRoller || dice || rolling ? (
                    <DicePair dice={dice} rolling={rolling} size={46} />
                ) : null}
                {total != null && total !== result?.raw && <span className="hts-display" style={{ fontSize: 40, color: 'var(--hts-gold-text)' }}>= {total}</span>}
                <ModifierChips mods={mods} players={players} targetId={rollerId} />
            </div>

            <div className="dock-actions">
                {challengeOpen && (
                    <>
                        <TimerRing fraction={challengeFraction} size={48} label={challengeSeconds.toFixed(0)} />
                        {!isRoller && (
                            <button type="button" className="hts-btn hts-btn--danger" disabled={!canChallenge} onClick={onChallenge}>
                                {canChallenge ? t.roll.challenge : t.roll.alreadyChallenged}
                            </button>
                        )}
                    </>
                )}
                {canRoll && <button type="button" className="hts-btn" onClick={roll}>{t.roll.roll}</button>}
            </div>
        </section>
    );
}

export default RollDock;
