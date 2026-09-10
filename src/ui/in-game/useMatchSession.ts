import { useCallback, useEffect, useRef, useState } from 'react';
import { playBackgroundMusic, playClassSound, playSound, type ClassSoundType } from '@/utils/SoundManager/SoundManager';
import { EMPTY_VIEW, parseMessage, sendMessage, type CardData, type MatchView, type RecentResult, type SocketRef } from '../common/types';
import { appendChat, type ChatMessage } from '../common/ChatPanel';
import type { PlayerTag } from './board/boardTypes';
import { diffMatchStates, type FxEvent } from './fx/fxDiff';
import type { Dict } from '@/i18n/pt';

const LINGER_MS = 2800;
const TAG_MS = 30000;
const TOAST_MS = 5000;
const TOAST_LIMIT = 2;
const FX_LIMIT = 12;
const SETUP_STATES = ['', 'ORDER_SELECTION', 'PARTY_LEADER_SELECTION'];

export interface Highlight {
    key: string;
    playerId: string;
    tagType: string;
}

/** A match-wide Kafka Streams highlight that isn't about one player (chain reactions, turning points). */
export interface Toast {
    key: string;
    situation: string;
    render: (t: Dict) => string;
}

export interface Revealed {
    ownerId: string;
    username: string;
    reason: string;
    cards: CardData[];
}

export function readLoggedUserId(): string {
    try {
        const id = JSON.parse(localStorage.getItem('currentPlayer') || 'null')?.id;
        return id == null ? '' : String(id);
    } catch {
        return '';
    }
}

/** The match as this client sees it. The engine decides everything; this hook only mirrors and sends intents. */
export function useMatchSession(socket: SocketRef, matchId: string | undefined, me: string) {
    const [view, setView] = useState<MatchView>(EMPTY_VIEW);
    const [linger, setLinger] = useState<RecentResult | null>(null);
    const [tieRolls, setTieRolls] = useState<Record<string, number | null> | null>(null);
    const [tieRound, setTieRound] = useState(0);
    const [tags, setTags] = useState<Record<string, PlayerTag[]>>({});
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [revealed, setRevealed] = useState<Revealed | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [fx, setFx] = useState<FxEvent[]>([]);
    const viewRef = useRef<MatchView>(EMPTY_VIEW);
    const lastRecent = useRef(0);
    const seq = useRef(0);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

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

    const send = useCallback((message: Record<string, unknown>) => {
        sendMessage(socket, { ...message, id: matchId });
    }, [socket, matchId]);

    const sendAction = useCallback((action: string, payload?: Record<string, unknown>) => {
        send({ type: 'match', subtype: 'action', action, payload: payload ?? {} });
    }, [send]);

    useEffect(() => {
        playBackgroundMusic();
        const pending = timers.current;
        return () => pending.forEach(clearTimeout);
    }, []);

    useEffect(() => {
        const ws = socket;
        if (!ws) return;

        const applyState = (next: MatchView) => {
            const prev = viewRef.current;
            if (!SETUP_STATES.includes(prev.matchState) && !SETUP_STATES.includes(next.matchState)) {
                pushFx(diffMatchStates(prev.players, next.players));
            }
            // A finished roll or duel stays on screen for a moment so everyone sees how it ended.
            if (next.recent && next.recent.seq !== lastRecent.current) {
                const isFirstState = prev.matchState === '';
                lastRecent.current = next.recent.seq;
                if (!isFirstState) {
                    const result = next.recent;
                    setLinger(result);
                    later(() => setLinger((current) => (current?.seq === result.seq ? null : current)), LINGER_MS);
                }
            }
            viewRef.current = next;
            setView(next);
        };

        const addTag = (playerId: string, tagType: string, targetName: string) => {
            const render = (t: Dict) => {
                if (tagType === 'FOCUSING') return t.tags.FOCUSING(targetName || t.common.someone);
                const fixed = t.tags[tagType as Exclude<keyof Dict['tags'], 'FOCUSING'>];
                return typeof fixed === 'string' ? fixed : String(tagType);
            };
            seq.current += 1;
            const key = `${tagType}-${seq.current}`;
            setTags((prev) => ({ ...prev, [playerId]: [...(prev[playerId] || []), { key, render, tagType }] }));
            setHighlights((prev) => [...prev, { key, playerId, tagType }]);
            later(() => setTags((prev) => ({ ...prev, [playerId]: (prev[playerId] || []).filter((tag) => tag.key !== key) })), TAG_MS);
        };

        const handle = (event: MessageEvent) => {
            const data = parseMessage(event);
            if (!data) return;
            const { type, subtype, payload } = data;

            if (type === 'match') {
                switch (subtype) {
                    case 'match_state':
                        applyState(payload as MatchView);
                        return;
                    case 'order_selection_tie':
                        setTieRolls(payload?.rolls || null);
                        setTieRound((r) => r + 1);
                        return;
                    case 'duel_start':
                        playSound('challenge');
                        return;
                    case 'chat_message':
                        setChat((prev) => appendChat(prev, payload));
                        return;
                    case 'chat_history':
                        setChat(Array.isArray(payload) ? payload : []);
                        return;
                    case 'modifier_played':
                        pushFx([{ kind: 'modifier', from: String(payload.playerId), to: String(payload.targetPlayerId), value: Number(payload.value) }]);
                        return;
                    case 'hand_revealed':
                        if (String(payload.viewerPlayerId) !== me) return;
                        setRevealed({
                            ownerId: String(payload.revealedPlayerId),
                            username: String(payload.revealedPlayerUsername || ''),
                            reason: String(payload.reason || ''),
                            cards: payload.cards || [],
                        });
                        return;
                    default:
                        return;
                }
            }

            if (type === 'dice_roll') {
                playSound('diceRoll');
                return;
            }

            if (type === 'sound') {
                if (subtype === 'play_class_sound' && data.payload) playClassSound(data.payload as ClassSoundType);
                if (subtype === 'play_draw_card_sound') playSound('cardDraw');
                return;
            }

            if (type === 'monitoring_alert') {
                if (data.situation === 'ACTION_HISTORY') return;
                const extra = data.extra || {};
                const taggedPlayerId = extra.taggedPlayerId ? String(extra.taggedPlayerId) : '';
                const tagType = extra.tagType ? String(extra.tagType) : '';
                const targetName = extra.targetId ? viewRef.current.players[String(extra.targetId)]?.username || '' : '';
                if (taggedPlayerId && tagType) {
                    addTag(taggedPlayerId, tagType, targetName);
                    return;
                }
                const situation = String(data.situation || '');
                const name = viewRef.current.players[String(extra.targetPlayerId ?? '')]?.username || '';
                const count = Number(extra.actionCount ?? extra.attackCount ?? extra.targetCount ?? 0);
                const fallback = data.message ? String(data.message) : '';
                seq.current += 1;
                const key = `${situation}-${seq.current}`;
                const render = (t: Dict) => {
                    const fn = t.feed.alerts[situation];
                    return fn ? fn({ name: name || t.common.someone, n: count, target: name || t.common.someone }) : fallback || t.feed.highlight;
                };
                setToasts((prev) => [...prev.filter((x) => x.situation !== situation), { key, situation, render }].slice(-TOAST_LIMIT));
                later(() => setToasts((prev) => prev.filter((x) => x.key !== key)), TOAST_MS);
            }
        };

        ws.addEventListener('message', handle);
        sendMessage(socket, { type: 'match', subtype: 'get_match_state', id: matchId });
        sendMessage(socket, { type: 'match', subtype: 'get_chat_history', id: matchId });
        return () => ws.removeEventListener('message', handle);
    }, [socket, matchId, me, later, pushFx]);

    const actions = {
        rollOrder: () => send({ type: 'match', subtype: 'order_selection', payload: { roll: 0 } }),
        chooseLeader: (leader: string) => send({ type: 'match', subtype: 'choose_party_leader', payload: { party_leader: leader } }),
        draw: () => sendAction('draw_card'),
        play: (cardId: number) => sendAction('play_card', { card_id: cardId }),
        useHero: (cardId: number) => sendAction('use_card', { card_id: cardId }),
        attack: (monsterId: number) => sendAction('attempt_slay_monster', { monster_id: monsterId }),
        redraw: () => sendAction('redraw_hand'),
        leaderSkill: () => sendAction('leader_skill'),
        endTurn: () => sendAction('end_turn'),
        roll: () => sendAction('roll'),
        pass: () => sendAction('pass'),
        challenge: () => sendAction('challenge'),
        answer: (choiceId: string, selection: string[], playerId?: string) =>
            sendAction('select_effect_target', { choice_id: choiceId, selection, ...(playerId ? { player_id: playerId } : {}) }),
        playModifier: (cardId: number, value: number, targetId: string, guardianBonus: number) =>
            sendAction('play_modifier', { card_id: cardId, chosen_value: value, target_player_id: targetId, guardian_bonus: guardianBonus }),
        closeReveal: () => setRevealed(null),
        sendChat: (text: string) => send({ type: 'match', subtype: 'chat', payload: { text } }),
    };

    return { view, linger, tieRolls, tieRound, tags, highlights, toasts, revealed, chat, fx, finishFx, actions };
}
