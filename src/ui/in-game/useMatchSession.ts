import { useCallback, useEffect, useRef, useState } from 'react';
import { playBackgroundMusic, playClassSound, playSound, type ClassSoundType } from '@/utils/SoundManager/SoundManager';
import { parseMessage, SELECTING_STATES, sendMessage, type CardData, type EngineMessage, type MonsterData, type PlayersMap, type Socket } from '../common/types';
import { appendChat, type ChatMessage } from '../common/ChatPanel';
import type { ActionHistoryEntry } from './components/ActionHistoryPanel';
import type { ModifierWindowState } from './components/ModifierPicker';
import type { CardRemoval, FeedEvent, FeedTone, HandRemoval, PlayerTag } from './board/boardTypes';
import type { HeroRollResult } from './rolls/RollDock';
import type { MonsterOutcome } from './rolls/MonsterScene';
import type { AppliedModifier } from './rolls/RollParts';
import { diffMatchStates, type FxEvent } from './fx/fxDiff';
import type { Dict } from '@/i18n/pt';

const LINGER_MS = 2600;
const REMOVAL_MS = 850;
const TAG_MS = 20000;
const FEED_LIMIT = 30;
const FX_LIMIT = 12;
const SETUP_STATES = ['', 'ORDER_SELECTION', 'PARTY_LEADER_SELECTION'];

export interface MonsterRollState {
    monster: MonsterData;
    attackerId: string;
    raw: number | null;
    outcome: { kind: MonsterOutcome; roll: number } | null;
}

export function readLoggedUserId(): string {
    try {
        const id = JSON.parse(localStorage.getItem('currentPlayer') || 'null')?.id;
        return id == null ? '' : String(id);
    } catch {
        return '';
    }
}

/** All match state and engine messages for one client. Rendering lives in InGame. */
export function useMatchSession(socket: Socket, matchId: string | undefined, me: string) {
    const [players, setPlayers] = useState<PlayersMap>({});
    const [matchState, setMatchState] = useState('');
    const [turn, setTurn] = useState('');
    const [availableLeaders, setAvailableLeaders] = useState<string[]>([]);
    const [monsters, setMonsters] = useState<MonsterData[]>([]);
    const [pendingMonsterAttack, setPendingMonsterAttack] = useState<{ monsterId: number; playerId: string } | null>(null);
    const [challengeWindowMs, setChallengeWindowMs] = useState(0);
    const [challengeRemainingMs, setChallengeRemainingMs] = useState(0);
    const [hasChallenged, setHasChallenged] = useState(false);
    const [modifierWindow, setModifierWindow] = useState<ModifierWindowState | null>(null);
    const [modifierWindowSeq, setModifierWindowSeq] = useState(0);
    const [mods, setMods] = useState<AppliedModifier[]>([]);
    const [duel, setDuel] = useState<{ heroId: string; challengerId: string } | null>(null);
    const [duelRolls, setDuelRolls] = useState<Record<string, number | null>>({});
    const [duelWinner, setDuelWinner] = useState<string | null>(null);
    const [heroRoll, setHeroRoll] = useState<HeroRollResult | null>(null);
    const [monsterRoll, setMonsterRoll] = useState<MonsterRollState | null>(null);
    const [targets, setTargets] = useState<Record<string, number[]>>({});
    const [maxTargets, setMaxTargets] = useState(0);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [tags, setTags] = useState<Record<string, PlayerTag[]>>({});
    const [history, setHistory] = useState<ActionHistoryEntry[]>([]);
    const [feed, setFeed] = useState<FeedEvent[]>([]);
    const [slain, setSlain] = useState<Record<string, number>>({});
    const [removal, setRemoval] = useState<CardRemoval | null>(null);
    const [handRemoval, setHandRemoval] = useState<HandRemoval | null>(null);
    const [revealed, setRevealed] = useState<{ username: string; cards: CardData[] } | null>(null);
    const [tieRolls, setTieRolls] = useState<Record<string, number | null> | null>(null);
    const [tieRound, setTieRound] = useState(0);
    const [locallyUsed, setLocallyUsed] = useState<number[]>([]);
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [fx, setFx] = useState<FxEvent[]>([]);
    const matchStateRef = useRef('');

    const playersRef = useRef(players);
    const monstersRef = useRef(monsters);
    const seq = useRef(0);
    const attackResolved = useRef(false);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        playersRef.current = players;
    }, [players]);
    useEffect(() => {
        monstersRef.current = monsters;
    }, [monsters]);

    const later = useCallback((fn: () => void, ms: number) => {
        timers.current.push(setTimeout(fn, ms));
    }, []);

    const pushFx = useCallback((events: Omit<FxEvent, 'id'>[]) => {
        if (events.length === 0) return;
        const stamped = events.map((e) => {
            seq.current += 1;
            return { ...e, id: seq.current };
        });
        setFx((prev) => [...prev, ...stamped].slice(-FX_LIMIT));
    }, []);

    const finishFx = useCallback((id: number) => {
        setFx((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const pushFeed = useCallback((render: (t: Dict) => string, tone: FeedTone) => {
        seq.current += 1;
        const entry = { id: seq.current, render, tone };
        setFeed((prev) => [entry, ...prev].slice(0, FEED_LIMIT));
    }, []);

    const nameOf = useCallback((pid?: string) => (pid && playersRef.current[pid]?.username) || '', []);

    const send = useCallback((message: Record<string, unknown>) => {
        sendMessage(socket, { ...message, id: matchId });
    }, [socket, matchId]);

    const sendAction = useCallback((action: string, payload?: Record<string, unknown>, extra?: Record<string, unknown>) => {
        send({ type: 'match', subtype: 'action', action, ...(payload ? { payload } : {}), ...(extra || {}) });
    }, [send]);

    useEffect(() => {
        playBackgroundMusic();
        const pending = timers.current;
        return () => pending.forEach(clearTimeout);
    }, []);

    useEffect(() => {
        if (!socket) return;

        const applyState = (payload: EngineMessage) => {
            const nextPlayers: PlayersMap = payload.players || {};
            const nextState: string = payload.matchState || '';
            if (!SETUP_STATES.includes(matchStateRef.current) && !SETUP_STATES.includes(nextState)) {
                pushFx(diffMatchStates(playersRef.current, nextPlayers));
            }
            matchStateRef.current = nextState;
            playersRef.current = nextPlayers;
            setPlayers(nextPlayers);
            setMatchState(nextState);
            setTurn(payload.currentPlayerTurn || '');
            setAvailableLeaders(payload.availablePartyLeaders || []);
            setChallengeWindowMs(payload.challengeWindowTime || 0);
            setHasChallenged((payload.challengerSet || []).map(String).includes(me));
            setMonsters(payload.monsters || []);
            setPendingMonsterAttack(payload.pendingMonsterAttack || null);
        };

        const handle = (event: MessageEvent) => {
            const data = parseMessage(event);
            if (!data) return;
            const { type, subtype, payload } = data;

            if (type === 'match') {
                switch (subtype) {
                    case 'match_state':
                    case 'order_finalized':
                        applyState(payload);
                        return;
                    case 'order_selection_tie': {
                        const previous: Record<string, number | null> = {};
                        Object.entries(playersRef.current).forEach(([pid, p]) => { previous[pid] = p.orderRoll; });
                        setTieRolls(previous);
                        setTieRound((r) => r + 1);
                        applyState(payload);
                        return;
                    }
                    case 'challenge_window_open':
                        pushFeed((t) => t.feed.challengeWindow, 'sky');
                        return;
                    case 'timer_update':
                        setChallengeRemainingMs(payload?.remainingTime || 0);
                        return;
                    case 'duel_start':
                        setDuel({ heroId: String(payload.heroPlayer), challengerId: String(payload.challenger) });
                        setDuelRolls({});
                        setDuelWinner(null);
                        setMods([]);
                        if (payload.matchState) setMatchState(payload.matchState);
                    {
                        const challenger = nameOf(payload.challenger);
                        const hero = nameOf(payload.heroPlayer);
                        pushFeed((t) => t.feed.challenge(challenger || t.common.someone, hero || t.common.someone), 'ember');
                    }
                        return;
                    case 'duel_result':
                        setDuelWinner(String(data.winner));
                    {
                        const winner = nameOf(data.winner);
                        pushFeed((t) => t.feed.duelWon(winner || t.common.someone), 'gold');
                    }
                        later(() => {
                            setDuel(null);
                            setDuelWinner(null);
                            setDuelRolls({});
                        }, LINGER_MS);
                        return;
                    case 'modifier_window_open':
                        setModifierWindow(payload);
                        setModifierWindowSeq((s) => s + 1);
                        return;
                    case 'modifier_window_closed':
                        setModifierWindow(null);
                        setHeroRoll((h) => (h ? { ...h, resolved: true } : h));
                        later(() => setHeroRoll(null), LINGER_MS);
                        return;
                    case 'modifier_played': {
                        seq.current += 1;
                        const mod = { id: seq.current, playerId: String(payload.playerId), targetPlayerId: String(payload.targetPlayerId), value: Number(payload.value) };
                        setMods((prev) => [...prev, mod]);
                        pushFx([{ kind: 'modifier', from: mod.playerId, to: mod.targetPlayerId, value: mod.value }]);
                        const signedValue = mod.value > 0 ? `+${mod.value}` : `−${Math.abs(mod.value)}`;
                        const caster = nameOf(mod.playerId);
                        const target = nameOf(mod.targetPlayerId);
                        pushFeed((t) => t.feed.modifier(caster || t.common.someone, signedValue, target || t.common.someone), mod.value > 0 ? 'jade' : 'ember');
                        return;
                    }
                    case 'select_effect_target':
                    case 'select_hand_target':
                        setTargets(payload?.target || {});
                        setMaxTargets(payload?.maxTargets || 0);
                        return;
                    case 'select_player_target':
                        setSelectedPlayerId(payload?.target ? String(payload.target) : null);
                        setMaxTargets(payload?.maxTargets || 1);
                        return;
                    case 'chat_message':
                        setChat((prev) => appendChat(prev, payload));
                        return;
                    case 'chat_history':
                        setChat(Array.isArray(payload) ? payload : []);
                        return;
                    case 'hand_revealed': {
                        if (String(payload.viewerPlayerId) !== me) return;
                        const owner = Object.values(playersRef.current).find((p) => p.username === payload.revealedPlayerUsername);
                        const ids: number[] = payload.cardIds || [];
                        const cards = ids.map((cid) => owner?.hand?.find((c) => c.cardId === cid) || { cardId: cid, cardName: `#${cid}` });
                        setRevealed({ username: payload.revealedPlayerUsername, cards });
                        return;
                    }
                    default:
                        return;
                }
            }

            if (type === 'dice_roll' && subtype === 'hero_roll') {
                setMods([]);
                setHeroRoll({ raw: Number(data.diceRoll), min: Number(data.minValue), resolved: false });
                return;
            }

            if (type === 'roll_result') {
                if (subtype === 'duel_roll') setDuelRolls(payload || {});
                if (subtype === 'monster_roll') {
                    setMods([]);
                    setMonsterRoll((m) => (m ? { ...m, raw: Number(payload.roll) } : m));
                }
                return;
            }

            if (type === 'animation') {
                if (subtype === 'monster_attack_start') {
                    const monster = monstersRef.current.find((m) => m.id === payload.monsterId);
                    if (monster) setMonsterRoll({ monster, attackerId: String(payload.playerId), raw: null, outcome: null });
                    return;
                }
                if (subtype === 'monster_slain' || subtype === 'monster_fight_back' || subtype === 'monster_survives') {
                    const kind = subtype as MonsterOutcome;
                    attackResolved.current = true;
                    setMonsterRoll((m) => (m ? { ...m, outcome: { kind, roll: Number(payload.roll) } } : m));
                    const who = nameOf(payload.playerId);
                    if (kind === 'monster_slain') {
                        setSlain((prev) => ({ ...prev, [payload.playerId]: (prev[payload.playerId] || 0) + 1 }));
                        pushFeed((t) => t.feed.slain(who || t.common.someone, payload.monsterName, payload.roll), 'jade');
                    } else if (kind === 'monster_fight_back') {
                        pushFeed((t) => t.feed.fightBack(payload.monsterName, who || t.common.someone, payload.roll), 'ember');
                    } else {
                        pushFeed((t) => t.feed.survives(payload.monsterName, who || t.common.someone, payload.roll), 'sky');
                    }
                    later(() => setMonsterRoll(null), LINGER_MS);
                    return;
                }
                if (subtype === 'destroy_card' || subtype === 'steal_card') {
                    setRemoval({ cardId: payload.cardId, kind: subtype === 'steal_card' ? 'steal' : 'destroy' });
                    later(() => setRemoval(null), REMOVAL_MS);
                    return;
                }
                if ((subtype === 'steal_hand_card' || subtype === 'discard_card') && String(payload?.targetPlayerId) === me) {
                    setHandRemoval({ cardId: payload.cardId, kind: subtype === 'steal_hand_card' ? 'stolen' : 'discarded' });
                    later(() => setHandRemoval(null), REMOVAL_MS);
                }
                return;
            }

            if (type === 'sound') {
                if (subtype === 'play_class_sound' && data.payload) playClassSound(data.payload as ClassSoundType);
                if (subtype === 'play_draw_card_sound') playSound('cardDraw');
                return;
            }

            if (type === 'monitoring_alert') {
                if (data.situation === 'ACTION_HISTORY') {
                    setHistory(data.extra?.history || []);
                    return;
                }
                const extra = data.extra || {};
                const situation = String(data.situation || '');
                const alertName = nameOf(extra.taggedPlayerId ?? extra.targetPlayerId);
                const alertTarget = nameOf(extra.targetId);
                const alertCount = Number(extra.drawStreak ?? extra.failStreak ?? extra.actionCount ?? extra.attackCount ?? extra.targetCount ?? 0);
                const fallback = data.message ? String(data.message) : '';
                pushFeed((t) => {
                    const render = t.feed.alerts[situation];
                    if (!render) return fallback || t.feed.highlight;
                    return render({ name: alertName || t.common.someone, n: alertCount, target: alertTarget || t.common.someone });
                }, 'gold');
                const taggedPlayerId = extra.taggedPlayerId;
                const tagType = extra.tagType;
                if (taggedPlayerId && tagType) {
                    const render = (t: Dict) => {
                        if (tagType === 'FOCUSING') return t.tags.FOCUSING(alertTarget || t.common.someone);
                        const fixed = t.tags[tagType as Exclude<keyof Dict['tags'], 'FOCUSING'>];
                        return typeof fixed === 'string' ? fixed : String(tagType);
                    };
                    seq.current += 1;
                    const key = `${tagType}-${seq.current}`;
                    setTags((prev) => ({ ...prev, [taggedPlayerId]: [...(prev[taggedPlayerId] || []), { key, render }] }));
                    later(() => setTags((prev) => ({ ...prev, [taggedPlayerId]: (prev[taggedPlayerId] || []).filter((t) => t.key !== key) })), TAG_MS);
                }
            }
        };

        socket.addEventListener('message', handle);
        sendMessage(socket, { type: 'match', subtype: 'get_match_state', id: matchId });
        sendMessage(socket, { type: 'match', subtype: 'get_chat_history', id: matchId });
        return () => socket.removeEventListener('message', handle);
    }, [socket, matchId, me, later, nameOf, pushFeed, pushFx]);

    // Selection resets once the effect resolves; the picker asks for current targets when it opens.
    useEffect(() => {
        if (SELECTING_STATES.includes(matchState)) {
            if (matchState !== 'SELECTING_PLAYER') send({ type: 'match', subtype: 'get_selected_targets' });
            return;
        }
        setTargets({});
        setSelectedPlayerId(null);
        setMaxTargets(0);
    }, [matchState, send]);

    useEffect(() => {
        if (matchState !== 'CHALLENGE_WINDOW') setChallengeRemainingMs(0);
    }, [matchState]);

    useEffect(() => {
        setLocallyUsed([]);
    }, [turn]);

    // Rejoining mid-attack: rebuild the attack scene from the match state (but never reopen a resolved one).
    useEffect(() => {
        if (matchState !== 'WAITING_MONSTER_ROLL') {
            attackResolved.current = false;
            setMonsterRoll((m) => (m && !m.outcome ? null : m));
            return;
        }
        if (!pendingMonsterAttack || monsterRoll || attackResolved.current) return;
        const monster = monsters.find((m) => m.id === pendingMonsterAttack.monsterId);
        if (monster) setMonsterRoll({ monster, attackerId: String(pendingMonsterAttack.playerId), raw: null, outcome: null });
    }, [matchState, pendingMonsterAttack, monsters, monsterRoll]);

    const actions = {
        rollOrder: (roll: number) => send({ type: 'match', subtype: 'order_selection', payload: { roll } }),
        chooseLeader: (leader: string) => send({ type: 'match', subtype: 'choose_party_leader', payload: { party_leader: leader } }),
        draw: () => sendAction('draw_card'),
        play: (cardId: number) => {
            sendAction('play_card', { card_id: cardId });
            setLocallyUsed((prev) => [...prev, cardId]);
        },
        useHero: (cardId: number) => sendAction('use_card', { card_id: cardId }),
        rollHero: (roll: number) => sendAction('process_hero_roll', { roll }),
        challenge: () => send({ type: 'match', subtype: 'challenge' }),
        rollDuel: (roll: number) => send({ type: 'match', subtype: 'process_challenge_roll', payload: { roll } }),
        attack: (monsterId: number) => sendAction('attempt_slay_monster', { monster_id: monsterId }),
        rollMonster: (roll: number) => send({ type: 'match', subtype: 'process_monster_roll', payload: { roll } }),
        toggleCardTarget: (playerId: string, cardId: number, isSelected: boolean) =>
            sendAction(isSelected ? 'deselect_effect_target' : 'select_effect_target', { card_id: cardId, player_id: playerId }),
        togglePlayerTarget: (playerId: string, isSelected: boolean) =>
            sendAction(isSelected ? 'deselect_effect_player' : 'select_effect_player', undefined, { targetPlayerId: playerId }),
        confirmTargets: () => sendAction('apply_card_effects'),
        closeModifierWindow: () => setModifierWindow(null),
        closeReveal: () => setRevealed(null),
        sendChat: (text: string) => send({ type: 'match', subtype: 'chat', payload: { text } }),
    };

    return {
        players, matchState, turn, availableLeaders, monsters, challengeWindowMs, challengeRemainingMs, hasChallenged,
        modifierWindow, modifierWindowSeq, mods, duel, duelRolls, duelWinner, heroRoll, monsterRoll,
        targets, maxTargets, selectedPlayerId, tags, history, feed, slain, removal, handRemoval, revealed,
        tieRolls, tieRound, locallyUsed, pendingMonsterAttack, chat, fx, finishFx, actions,
    };
}
