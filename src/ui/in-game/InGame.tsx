import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WebSocketContext from '@/utils/WebSocketContext';
import { getMonsterArt } from '@/utils/CardArt';
import { classInfo, type HeroClassId } from '@/utils/ClassInfo';
import { monsterRequirement, useI18n } from '@/i18n';
import type { Dict } from '@/i18n/pt';
import tableBackground from '../assets/ingame.png';
import { CardInspector, type InspectorAction } from '../common/CardInspector';
import { ChatPanel, type ChatMessage } from '../common/ChatPanel';
import { SELECTING_STATES, type CardData, type MonsterData } from '../common/types';
import ActionHistoryPanel from './components/ActionHistoryPanel';
import ModifierPicker from './components/ModifierPicker';
import ActionPanel from './board/ActionPanel';
import Arena from './board/Arena';
import OpponentRail from './board/OpponentRail';
import { HandReveal, MatchEnd, PartyViewer, RulesSheet, TurnBanner } from './board/Overlays';
import PlayerZone, { isPlayableFromHand } from './board/PlayerZone';
import TargetSheet from './board/TargetSheet';
import TopBar from './board/TopBar';
import FxLayer from './fx/FxLayer';
import DuelScene from './rolls/DuelScene';
import MonsterScene from './rolls/MonsterScene';
import RollDock from './rolls/RollDock';
import InitiativeScreen from './screens/InitiativeScreen';
import LeaderDraftScreen from './screens/LeaderDraftScreen';
import { readLoggedUserId, useMatchSession } from './useMatchSession';
import './board/board.css';

const BANNER_MS = 1600;
const BUBBLE_MS = 4500;
const ATTACK_COST = 2;
const SETUP_STATES = ['', 'ORDER_SELECTION', 'PARTY_LEADER_SELECTION'];

type Inspecting =
    | { kind: 'hand' | 'party'; card: CardData }
    | { kind: 'other'; card: CardData }
    | { kind: 'leader'; leader: string }
    | { kind: 'monster'; monster: MonsterData };

function phaseLabel(t: Dict, matchState: string, isMyTurn: boolean, ap: number, max: number, turnName: string): string {
    switch (matchState) {
        case 'GAMEPLAY': return isMyTurn ? t.phase.gameplayMine(ap, max) : t.phase.gameplayOther(turnName);
        case 'WAITING_HERO_ROLL': return t.phase.heroRoll;
        case 'CHALLENGE_WINDOW': return t.phase.challengeWindow;
        case 'CHALLENGE_ROLL': return t.phase.challengeRoll;
        case 'WAITING_MONSTER_ROLL': return t.phase.monster;
        case 'SELECTING_CARDS':
        case 'SELECTING_HAND_CARDS':
        case 'SELECTING_PLAYER': return t.phase.selecting;
        case 'FINISHED': return t.phase.finished;
        default: return t.phase.resolving;
    }
}

function InGame() {
    const socket = useContext(WebSocketContext);
    const navigate = useNavigate();
    const { t } = useI18n();
    const { id } = useParams();
    const me = useMemo(readLoggedUserId, []);
    const s = useMatchSession(socket, id, me);
    const { players, matchState, turn, actions } = s;

    const [historyOpen, setHistoryOpen] = useState(false);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [viewing, setViewing] = useState<string | null>(null);
    const [inspecting, setInspecting] = useState<Inspecting | null>(null);
    const [banner, setBanner] = useState<string | null>(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [seenChat, setSeenChat] = useState(0);
    const [bubbles, setBubbles] = useState<ChatMessage[]>([]);
    const lastTurn = useRef('');
    const lastChatCount = useRef(0);

    // New messages from others pop up as short bubbles while the chat is closed.
    useEffect(() => {
        const fresh = s.chat.slice(lastChatCount.current);
        lastChatCount.current = s.chat.length;
        if (chatOpen) {
            setSeenChat(s.chat.length);
            return;
        }
        const incoming = fresh.filter((m) => m.playerId !== me);
        if (incoming.length === 0) return;
        setBubbles((prev) => [...prev, ...incoming].slice(-3));
        const t = setTimeout(() => setBubbles((prev) => prev.filter((b) => !incoming.includes(b))), BUBBLE_MS);
        return () => clearTimeout(t);
    }, [s.chat, chatOpen, me]);

    useEffect(() => {
        if (!me) navigate('/');
    }, [me, navigate]);

    useEffect(() => {
        if (!turn || turn === lastTurn.current || SETUP_STATES.includes(matchState)) return;
        lastTurn.current = turn;
        setBanner(turn);
        const t = setTimeout(() => setBanner(null), BANNER_MS);
        return () => clearTimeout(t);
    }, [turn, matchState]);

    const ids = Object.keys(players);
    const order = useMemo(() => {
        const all = Object.keys(players);
        if (all.some((pid) => players[pid].orderRoll == null)) return all;
        return [...all].sort((a, b) => (players[b].orderRoll ?? 0) - (players[a].orderRoll ?? 0));
    }, [players]);
    const opponents = order.filter((pid) => pid !== me);
    const mine = players[me];
    const isMyTurn = turn === me;
    const ap = mine?.currentAP ?? 0;
    const canAct = isMyTurn && matchState === 'GAMEPLAY' && ap > 0;
    const canAttack = isMyTurn && matchState === 'GAMEPLAY' && ap >= ATTACK_COST;
    const turnName = players[turn]?.username || '…';

    if (matchState === '' || matchState === 'ORDER_SELECTION' || matchState === 'PARTY_LEADER_SELECTION') {
        return (
            <div className="hts-screen">
                <img src={tableBackground} alt="" className="hts-screen-bg" style={{ opacity: 0.24 }} />
                {matchState === '' && <p className="hts-display" style={{ position: 'relative', textAlign: 'center', paddingTop: '40vh', fontSize: 40 }}>{t.board.preparing}</p>}
                {matchState === 'ORDER_SELECTION' && (
                    <InitiativeScreen key={s.tieRound} players={players} me={me} tieRolls={s.tieRolls} onRoll={actions.rollOrder} />
                )}
                {matchState === 'PARTY_LEADER_SELECTION' && (
                    <LeaderDraftScreen players={players} me={me} turn={turn} order={order} available={s.availableLeaders} onChoose={actions.chooseLeader} />
                )}
            </div>
        );
    }

    const pendingCard = players[turn]?.pendingHeroCard || null;
    const showDuel = !!s.duel && (matchState === 'CHALLENGE_ROLL' || !!s.duelWinner);
    const showDock = !showDuel && !s.monsterRoll && !!turn
        && (matchState === 'CHALLENGE_WINDOW' || (matchState === 'WAITING_HERO_ROLL' && !!pendingCard) || !!s.heroRoll);
    const selecting = SELECTING_STATES.includes(matchState);
    const myModifiers = (mine?.hand || []).some((c) => c.type === 'MODIFIER');

    function inspectorProps(target: Inspecting): { card?: CardData; image?: string; title?: string; kicker?: string; hint?: string; actions: InspectorAction[] } {
        const close = () => setInspecting(null);
        if (target.kind === 'leader') {
            const info = classInfo(target.leader);
            const text = t.classes[target.leader as HeroClassId];
            return { image: info?.leaderArt, title: info?.leaderName, kicker: t.inspect.leaderKicker(text?.label ?? ''), hint: text?.skill, actions: [] };
        }
        if (target.kind === 'monster') {
            const m = target.monster;
            return {
                image: getMonsterArt(m.name),
                title: m.name,
                kicker: t.inspect.monsterKicker,
                hint: t.inspect.monsterHint(monsterRequirement(t, m.partyRequirement), m.slayThreshold, m.fightBackThreshold),
                actions: canAttack ? [{ label: t.board.attack(ATTACK_COST), onClick: () => { actions.attack(m.id); close(); } }] : [],
            };
        }
        const card = target.card;
        if (target.kind === 'hand') {
            const playable = canAct && isPlayableFromHand(card);
            return {
                card,
                hint: t.inspect.hints[card.type || ''] ?? '',
                actions: playable ? [{ label: t.inspect.play, onClick: () => { actions.play(card.cardId); close(); } }] : [],
            };
        }
        if (target.kind === 'party') {
            const used = mine?.usedCardIds?.includes(card.cardId) || s.locallyUsed.includes(card.cardId);
            const canRoll = canAct && card.type === 'HERO' && !used;
            return {
                card,
                hint: used ? t.inspect.partyUsed : t.inspect.partyRoll,
                actions: canRoll ? [{ label: t.inspect.rollEffect, onClick: () => { actions.useHero(card.cardId); close(); } }] : [],
            };
        }
        return { card, actions: [] };
    }

    return (
        <div className="board">
            <img src={tableBackground} alt="" className="hts-screen-bg board-bg" />
            <div className="board-vignette" aria-hidden="true" />

            <TopBar
                matchId={id}
                players={players}
                order={order}
                turn={turn}
                me={me}
                historyOpen={historyOpen}
                chatOpen={chatOpen}
                unread={chatOpen ? 0 : s.chat.slice(seenChat).filter((m) => m.playerId !== me).length}
                onToggleHistory={() => { setHistoryOpen((v) => !v); setChatOpen(false); }}
                onToggleChat={() => { setChatOpen((v) => !v); setHistoryOpen(false); setSeenChat(s.chat.length); setBubbles([]); }}
                onOpenRules={() => setRulesOpen(true)}
            />

            <OpponentRail players={players} ids={opponents} turn={turn} slain={s.slain} tags={s.tags} removal={s.removal} onOpen={setViewing} />

            <Arena
                monsters={s.monsters}
                canDraw={canAct}
                canAttack={canAttack}
                feed={s.feed}
                onDraw={actions.draw}
                onAttack={actions.attack}
                onInspectMonster={(monster) => setInspecting({ kind: 'monster', monster })}
                onOpenHistory={() => setHistoryOpen(true)}
            />

            <div className="bottom">
                <PlayerZone
                    player={mine}
                    slainCount={s.slain[me] || 0}
                    tags={s.tags[me] || []}
                    removal={s.removal}
                    handRemoval={s.handRemoval}
                    canPlay={canAct}
                    locallyUsed={s.locallyUsed}
                    onPlay={actions.play}
                    onInspectLeader={() => mine?.leader && setInspecting({ kind: 'leader', leader: mine.leader })}
                    onInspectCard={(card, source) => setInspecting({ kind: source, card })}
                />
                <ActionPanel
                    isMyTurn={isMyTurn}
                    turnName={turnName}
                    currentAP={ap}
                    maxAP={mine?.maxAP ?? 3}
                    phaseLabel={phaseLabel(t, matchState, isMyTurn, ap, mine?.maxAP ?? 3, turnName)}
                    canDraw={canAct}
                    onDraw={actions.draw}
                    onOpenRules={() => setRulesOpen(true)}
                />
            </div>

            <FxLayer events={s.fx} me={me} onDone={s.finishFx} />

            {showDock && (
                <RollDock
                    key={`${turn}-${pendingCard?.cardId ?? 'card'}`}
                    players={players}
                    me={me}
                    rollerId={turn}
                    card={pendingCard}
                    matchState={matchState}
                    challengeFraction={s.challengeWindowMs ? s.challengeRemainingMs / s.challengeWindowMs : 0}
                    challengeSeconds={s.challengeRemainingMs / 1000}
                    canChallenge={!s.hasChallenged && !isMyTurn}
                    result={s.heroRoll}
                    mods={s.mods}
                    onRoll={actions.rollHero}
                    onChallenge={actions.challenge}
                />
            )}

            {selecting && !isMyTurn && (
                <div className="status-banner" role="status">{t.board.picking(turnName, pendingCard?.cardName)}</div>
            )}
            {selecting && isMyTurn && (
                <TargetSheet
                    mode={matchState as 'SELECTING_CARDS' | 'SELECTING_HAND_CARDS' | 'SELECTING_PLAYER'}
                    players={players}
                    me={me}
                    source={mine?.pendingHeroCard || null}
                    targets={s.targets}
                    maxTargets={s.maxTargets}
                    selectedPlayerId={s.selectedPlayerId}
                    onToggleCard={actions.toggleCardTarget}
                    onTogglePlayer={actions.togglePlayerTarget}
                    onConfirm={actions.confirmTargets}
                />
            )}

            {showDuel && s.duel && (
                <DuelScene
                    key={`${s.duel.heroId}-${s.duel.challengerId}`}
                    players={players}
                    me={me}
                    heroId={s.duel.heroId}
                    challengerId={s.duel.challengerId}
                    card={players[s.duel.heroId]?.pendingHeroCard || null}
                    rolls={s.duelRolls}
                    winnerId={s.duelWinner}
                    mods={s.mods}
                    onRoll={actions.rollDuel}
                />
            )}

            {s.monsterRoll && (
                <MonsterScene
                    key={s.monsterRoll.monster.id}
                    players={players}
                    me={me}
                    attackerId={s.monsterRoll.attackerId}
                    monster={s.monsterRoll.monster}
                    raw={s.monsterRoll.raw}
                    outcome={s.monsterRoll.outcome}
                    mods={s.mods}
                    onRoll={actions.rollMonster}
                />
            )}

            {s.modifierWindow && myModifiers && (
                <ModifierPicker
                    key={s.modifierWindowSeq}
                    window={s.modifierWindow}
                    hand={mine?.hand || []}
                    playersData={players}
                    me={me}
                    socket={socket}
                    id={id}
                    onPlay={actions.closeModifierWindow}
                />
            )}

            {chatOpen && (
                <div className="game-chat hts-rise">
                    <ChatPanel
                        messages={s.chat}
                        me={me}
                        colorFor={(pid) => classInfo(players[pid]?.leader)?.tint ?? 'var(--hts-gold)'}
                        onSend={actions.sendChat}
                        phrases={t.chat.gamePhrases}
                        autoFocus
                        onClose={() => setChatOpen(false)}
                    />
                </div>
            )}
            {!chatOpen && bubbles.length > 0 && (
                <div className="chat-bubbles" aria-hidden="true">
                    {bubbles.map((b) => (
                        <div key={`${b.timestamp}-${b.playerId}`} className="chat-bubble">
                            <b style={{ color: classInfo(players[b.playerId]?.leader)?.tint ?? 'var(--hts-gold)' }}>{b.username}</b>
                            {b.text}
                        </div>
                    ))}
                </div>
            )}
            {historyOpen && <ActionHistoryPanel history={s.history} playersData={players} onClose={() => setHistoryOpen(false)} />}
            {rulesOpen && <RulesSheet onClose={() => setRulesOpen(false)} />}
            {viewing && players[viewing] && (
                <PartyViewer
                    player={players[viewing]}
                    slainCount={s.slain[viewing] || 0}
                    onClose={() => setViewing(null)}
                    onInspect={(card) => setInspecting({ kind: 'other', card })}
                />
            )}
            {s.revealed && <HandReveal username={s.revealed.username} cards={s.revealed.cards} onClose={actions.closeReveal} />}
            {inspecting && <CardInspector {...inspectorProps(inspecting)} onClose={() => setInspecting(null)} />}
            {banner && players[banner] && <TurnBanner name={players[banner].username} leader={players[banner].leader} isMe={banner === me} />}
            {matchState === 'FINISHED' && <MatchEnd players={players} slain={s.slain} onLeave={() => navigate('/games')} />}
            {ids.length === 0 && <p className="status-banner">{t.board.connecting}</p>}
        </div>
    );
}

export default InGame;
