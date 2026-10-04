import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WebSocketContext from '@/utils/WebSocketContext';
import { getMonsterArt } from '@/utils/CardArt';
import { classInfo, type HeroClassId } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import tableBackground from '../assets/ingame.png';
import { CardInspector, type InspectorAction } from '../common/CardInspector';
import { ChatPanel } from '../common/ChatPanel';
import type { CardData, DuelData, MonsterData, RollData } from '../common/types';
import ModifierPicker from './components/ModifierPicker';
import ActionPanel from './board/ActionPanel';
import Arena from './board/Arena';
import ChoiceSheet, { ChoiceWaiting } from './board/ChoiceSheet';
import OpponentRail from './board/OpponentRail';
import { DiscardViewer, HandReveal, HistoryPanel, MatchEnd, PartyViewer, RulesSheet, SettingsSheet, TurnBanner } from './board/Overlays';
import PlayerZone, { isPlayableFromHand } from './board/PlayerZone';
import TopBar from './board/TopBar';
import { renderAnnouncement, renderNotice } from './board/announce';
import SurrenderButton from './board/SurrenderButton';
import LoadingScreen from './screens/LoadingScreen';
import SetupClock from './screens/SetupClock';
import { StageSide } from '../common/Stage';
import { tagStyle } from './board/boardTypes';
import FxLayer from './fx/FxLayer';
import ChallengeDock from './rolls/ChallengeDock';
import DuelScene from './rolls/DuelScene';
import MonsterScene from './rolls/MonsterScene';
import HeroRollScene from './rolls/HeroRollScene';
import InitiativeScreen from './screens/InitiativeScreen';
import LeaderDraftScreen from './screens/LeaderDraftScreen';
import { readLoggedUserId, useMatchSession } from './useMatchSession';
import './board/board.css';
import './board/table.css';

const BANNER_MS = 1600;
const ATTACK_COST = 2;
/** Width of the chat column kept beside full-screen scenes. */
const CHAT_SIDE_W = 340;
const SYSTEM_ID = 'system';
const SETUP_STATES = ['', 'LOADING', 'ORDER_SELECTION', 'PARTY_LEADER_SELECTION'];

type Inspecting =
    | { kind: 'hand' | 'party'; card: CardData }
    | { kind: 'other'; card: CardData }
    | { kind: 'leader'; leader: string }
    | { kind: 'monster'; monster: MonsterData };

function InGame() {
    const socket = useContext(WebSocketContext);
    const navigate = useNavigate();
    const { t } = useI18n();
    const { id } = useParams();
    const me = useMemo(readLoggedUserId, []);
    const s = useMatchSession(socket, id, me);
    const { view, actions } = s;
    const { players, matchState, currentPlayerTurn: turn, pending } = view;

    const [historyOpen, setHistoryOpen] = useState(false);
    const [rulesOpen, setRulesOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [discardOpen, setDiscardOpen] = useState(false);
    const [viewing, setViewing] = useState<string | null>(null);
    const [inspecting, setInspecting] = useState<Inspecting | null>(null);
    const [banner, setBanner] = useState<string | null>(null);
    const lastTurn = useRef('');

    useEffect(() => {
        if (!me) navigate('/');
    }, [me, navigate]);

    useEffect(() => {
        if (!turn || turn === lastTurn.current || SETUP_STATES.includes(matchState)) return;
        lastTurn.current = turn;
        setBanner(turn);
        const timer = setTimeout(() => setBanner(null), BANNER_MS);
        return () => clearTimeout(timer);
    }, [turn, matchState]);

    const order = view.turnOrder.length > 0 ? view.turnOrder : Object.keys(players);
    const opponents = useMemo(() => {
        const start = order.indexOf(me);
        return start < 0 ? order.filter((pid) => pid !== me) : [...order.slice(start + 1), ...order.slice(0, start)];
    }, [order, me]);
    const mine = players[me];
    const isMyTurn = turn === me;
    const ap = mine?.currentAP ?? 0;
    const ready = isMyTurn && matchState === 'GAMEPLAY' && view.idle;
    const canAct = ready && ap > 0;
    const canAttack = ready && ap >= ATTACK_COST;
    const turnName = players[turn]?.username || '…';

    const surrender = () => {
        actions.surrender();
        navigate('/games');
    };

    // Short notices on top: what someone chose, who dropped, came back or left.
    const toastsNode = s.toasts.length > 0 && (
        <div className="ks-toasts" role="status" aria-live="polite">
            {s.toasts.map((toast) => {
                const style = tagStyle(toast.situation);
                let text = toast.render(t);
                if (toast.announcement) text = renderAnnouncement(t, toast.announcement, players);
                if (toast.notice) text = renderNotice(t, toast.notice, players);
                return (
                    <div key={toast.key} className="ks-toast hts-rise" style={{ borderColor: style.bg }}>
                        <span className="ks-toast-mark" style={{ background: style.bg, color: style.fg }}>{style.mark}</span>
                        <span>{text}</span>
                    </div>
                );
            })}
        </div>
    );

    if (SETUP_STATES.includes(matchState)) {
        // Players who left before the game started are no longer part of setup.
        const seated = Object.fromEntries(Object.entries(players).filter(([, p]) => !p.leftReason));
        return (
            <div className="hts-screen">
                <img src={tableBackground} alt="" className="hts-screen-bg" style={{ opacity: 0.24 }} />
                {matchState === '' && <p className="hts-display" style={{ position: 'relative', textAlign: 'center', paddingTop: '40vh', fontSize: 40 }}>{t.board.preparing}</p>}
                {matchState === 'LOADING' && (
                    <LoadingScreen players={seated} me={me} loaded={view.loaded ?? []} remainingMs={view.setupRemainingMs ?? 0} />
                )}
                {matchState === 'ORDER_SELECTION' && (
                    <InitiativeScreen key={s.tieRound} players={seated} me={me} tieRolls={s.tieRolls} onRoll={actions.rollOrder} />
                )}
                {matchState === 'PARTY_LEADER_SELECTION' && (
                    <LeaderDraftScreen players={seated} me={me} turn={turn} order={view.pickOrder.filter((pid) => seated[pid])} available={view.availablePartyLeaders} onChoose={actions.chooseLeader} />
                )}
                {(matchState === 'ORDER_SELECTION' || matchState === 'PARTY_LEADER_SELECTION') && (
                    <SetupClock key={`${matchState}-${turn}-${s.tieRound}`} remainingMs={view.setupRemainingMs ?? 0} kind={matchState === 'ORDER_SELECTION' ? 'initiative' : 'leader'} />
                )}
                {matchState !== '' && <SurrenderButton floating onSurrender={surrender} />}
                {toastsNode}
            </div>
        );
    }

    // What the roll area shows: the live pending roll, or the one that just ended (for a moment).
    const linger = s.linger;
    let heroRoll: RollData | null = null;
    let attackRoll: RollData | null = null;
    let duel: DuelData | null = null;
    if (pending?.type === 'roll') {
        if (pending.roll.kind === 'HERO') heroRoll = pending.roll;
        else attackRoll = pending.roll;
    } else if (pending?.type === 'duel') {
        duel = pending;
    } else if (!pending && linger) {
        if (linger.type === 'roll') {
            if (linger.roll.kind === 'HERO') heroRoll = linger.roll;
            else attackRoll = linger.roll;
        } else {
            duel = linger.duel;
        }
    }
    const modifierWindow = pending?.type === 'roll' || pending?.type === 'duel' ? pending.modifierWindow : undefined;
    const windowRolls = pending?.type === 'roll' ? [pending.roll] : pending?.type === 'duel' ? [pending.ownerRoll, pending.challengerRoll] : [];
    const canModify = !!modifierWindow && modifierWindow.holders.includes(me) && !modifierWindow.passed.includes(me);
    const choice = pending?.type === 'choice' ? pending : null;

    function inspectorProps(target: Inspecting): { card?: CardData; monster?: MonsterData; image?: string; title?: string; kicker?: string; hint?: string; actions: InspectorAction[] } {
        const close = () => setInspecting(null);
        if (target.kind === 'leader') {
            const info = classInfo(target.leader);
            const text = t.classes[target.leader as HeroClassId];
            return { image: info?.leaderArt, title: info?.leaderName, kicker: t.inspect.leaderKicker(text?.label ?? ''), hint: text?.skill, actions: [] };
        }
        if (target.kind === 'monster') {
            const m = target.monster;
            const onBoard = view.monsters.some((x) => x.id === m.id);
            return {
                image: getMonsterArt(m.name),
                title: m.name,
                kicker: t.inspect.monsterKicker,
                monster: m,
                actions: canAttack && onBoard ? [{ label: t.board.attack(ATTACK_COST), onClick: () => { actions.attack(m.id); close(); } }] : [],
            };
        }
        const card = target.card;
        if (target.kind === 'hand') {
            const playable = canAct && isPlayableFromHand(card);
            return {
                card,
                actions: playable ? [{ label: t.inspect.play, onClick: () => { actions.play(card.cardId); close(); } }] : [],
            };
        }
        if (target.kind === 'party') {
            const used = mine?.usedCardIds?.includes(card.cardId);
            const sealed = card.item?.cardName === 'Sealing Key';
            const canRoll = canAct && card.type === 'HERO' && !used && !sealed;
            return {
                card,
                hint: used ? t.inspect.partyUsed : t.inspect.partyRoll,
                actions: canRoll ? [{ label: t.inspect.rollEffect, onClick: () => { actions.useHero(card.cardId); close(); } }] : [],
            };
        }
        return { card, actions: [] };
    }

    // Choices made by anyone show up in the chat as table lines, between what players typed.
    const chatMessages = [
        ...s.chat,
        ...s.announcements.map((a) => ({ playerId: SYSTEM_ID, username: t.engine.announce.table, text: renderAnnouncement(t, a, players), timestamp: a.ts })),
        ...s.notices.map((n) => ({ playerId: SYSTEM_ID, username: t.engine.announce.table, text: renderNotice(t, n, players), timestamp: n.ts })),
    ].sort((a, b) => a.timestamp - b.timestamp);
    const chatPanel = (
        <ChatPanel
            messages={chatMessages}
            me={me}
            colorFor={(pid) => (pid === SYSTEM_ID ? 'var(--hts-sky-text)' : classInfo(players[pid]?.leader)?.tint ?? 'var(--hts-gold)')}
            onSend={actions.sendChat}
            phrases={t.chat.gamePhrases}
        />
    );

    return (
        <StageSide.Provider value={{ width: CHAT_SIDE_W, node: chatPanel }}>
            <div className="board">
                <img src={tableBackground} alt="" className="hts-screen-bg board-bg" />
                <div className="board-vignette" aria-hidden="true" />

                <TopBar
                    matchId={id}
                    round={view.round}
                    drawPileCount={view.drawPileCount}
                    discardCount={view.discardPile.length}
                    players={players}
                    order={order}
                    turn={turn}
                    me={me}
                    historyOpen={historyOpen}
                    onToggleHistory={() => setHistoryOpen((v) => !v)}
                    onOpenRules={() => setRulesOpen(true)}
                    onOpenSettings={() => setSettingsOpen(true)}
                    onSurrender={surrender}
                    canSurrender={matchState === 'GAMEPLAY' && !mine?.leftReason}
                />

                <OpponentRail players={players} ids={opponents} turn={turn} tags={s.tags} disconnected={view.disconnected ?? []} onOpen={setViewing} />

                <Arena
                    monsters={view.monsters}
                    drawPileCount={view.drawPileCount}
                    discardPile={view.discardPile}
                    monsterDeckCount={view.monsterDeckCount}
                    canDraw={canAct}
                    canAttack={canAttack}
                    onDraw={actions.draw}
                    onAttack={actions.attack}
                    onInspectMonster={(monster) => setInspecting({ kind: 'monster', monster })}
                    onOpenDiscard={() => setDiscardOpen(true)}
                    side={chatPanel}
                />

                <div className="bottom">
                    <PlayerZone
                        player={mine}
                        tags={s.tags[me] || []}
                        canPlay={canAct}
                        onPlay={actions.play}
                        onInspectLeader={() => mine?.leader && setInspecting({ kind: 'leader', leader: mine.leader })}
                        onInspectCard={(card, source) => setInspecting({ kind: source, card })}
                        onInspectMonster={(monster) => setInspecting({ kind: 'monster', monster })}
                    />
                    <ActionPanel
                        isMyTurn={isMyTurn && matchState === 'GAMEPLAY'}
                        turnName={turnName}
                        currentAP={ap}
                        maxAP={mine?.maxAP ?? 3}
                        idle={view.idle}
                        canThiefSkill={mine?.leader === 'THIEF' && !mine.leaderSkillUsed}
                        onDraw={actions.draw}
                        onRedraw={actions.redraw}
                        onLeaderSkill={actions.leaderSkill}
                        onEndTurn={actions.endTurn}
                    />
                </div>

                <FxLayer events={s.fx} me={me} onDone={s.finishFx} />

                {pending?.type === 'challenge_window' && (
                    <ChallengeDock pending={pending} players={players} me={me} onChallenge={actions.challenge} onPass={actions.pass} />
                )}
                {heroRoll && (
                    <HeroRollScene
                        key={heroRoll.rollId}
                        roll={heroRoll}
                        modifierWindow={modifierWindow}
                        players={players}
                        me={me}
                        hand={mine?.hand || []}
                        onRoll={actions.roll}
                        onPlayModifier={actions.playModifier}
                        onPass={actions.pass}
                    />
                )}
                {attackRoll && <MonsterScene key={attackRoll.rollId} roll={attackRoll} modifierWindow={modifierWindow} players={players} me={me} onRoll={actions.roll} />}
                {duel && (
                    <DuelScene
                        key={duel.ownerRoll.rollId}
                        duel={duel}
                        players={players}
                        me={me}
                        hand={mine?.hand || []}
                        onRoll={actions.roll}
                        onPlayModifier={actions.playModifier}
                        onPass={actions.pass}
                    />
                )}
                {canModify && modifierWindow && attackRoll && (
                    <ModifierPicker
                        window={modifierWindow}
                        rolls={windowRolls}
                        hand={mine?.hand || []}
                        players={players}
                        me={me}
                        placement="dock"
                        onPlay={actions.playModifier}
                        onPass={actions.pass}
                    />
                )}

                {/* Everyone sees the selection screen; the others watch it read-only. */}
                {choice && (choice.chooserId === me || choice.options) && (
                    <ChoiceSheet choice={choice} players={players} me={me} onAnswer={actions.answer} onPreview={actions.previewChoice} />
                )}
                {choice && choice.chooserId !== me && !choice.options && <ChoiceWaiting choice={choice} players={players} />}

                {toastsNode}
                {historyOpen && <HistoryPanel log={view.log} players={players} onClose={() => setHistoryOpen(false)} />}
                {rulesOpen && <RulesSheet onClose={() => setRulesOpen(false)} />}
                {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
                {discardOpen && <DiscardViewer cards={view.discardPile} onClose={() => setDiscardOpen(false)} onInspect={(card) => setInspecting({ kind: 'other', card })} />}
                {viewing && players[viewing] && (
                    <PartyViewer
                        player={players[viewing]}
                        onClose={() => setViewing(null)}
                        onInspect={(card) => setInspecting({ kind: 'other', card })}
                        onInspectMonster={(monster) => setInspecting({ kind: 'monster', monster })}
                    />
                )}
                {s.revealed && <HandReveal username={s.revealed.username} reason={s.revealed.reason} cards={s.revealed.cards} onClose={actions.closeReveal} />}
                {inspecting && <CardInspector {...inspectorProps(inspecting)} onClose={() => setInspecting(null)} />}
                {banner && players[banner] && matchState === 'GAMEPLAY' && <TurnBanner name={players[banner].username} leader={players[banner].leader} isMe={banner === me} />}
                {matchState === 'FINISHED' && view.winner && !historyOpen && (
                    <MatchEnd
                        players={players}
                        winner={view.winner}
                        round={view.round}
                        startedAt={view.startedAt}
                        log={view.log}
                        highlights={s.highlights}
                        onHistory={() => setHistoryOpen(true)}
                        onLeave={() => navigate('/games')}
                    />
                )}
                {Object.keys(players).length === 0 && <p className="status-banner">{t.board.connecting}</p>}
                {mine?.leftReason && matchState === 'GAMEPLAY' && (
                    <div className="status-banner left-banner" role="status">
                        <b>{t.engine.presence.youLeft}</b>
                        <button type="button" className="hts-btn hts-btn--sm" onClick={() => navigate('/games')}>{t.engine.end.back}</button>
                    </div>
                )}
            </div>
        </StageSide.Provider>
    );
}

export default InGame;
