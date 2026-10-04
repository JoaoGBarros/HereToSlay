import { useEffect, useMemo, useRef, useState } from 'react';
import { classInfo } from '@/utils/ClassInfo';
import { useI18n } from '@/i18n';
import type { Dict } from '@/i18n/pt';
import tableBackground from '../../assets/ingame.png';
import { cardTypeLabel, GameCard } from '../../common/GameCard';
import { Stage } from '../../common/Stage';
import type { ChoiceOption, ChoicePending, PlayersMap } from '../../common/types';
import '../rolls/stage.css';

const TICK_MS = 250;

function Reticle() {
    return (
        <svg className="tg3-reticle" width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#e8693f" strokeWidth="4" strokeDasharray="20 11" />
            <path d="M48 0v18M48 78v18M0 48h18M78 48h18" stroke="#e8693f" strokeWidth="4" />
        </svg>
    );
}

type Mode = 'confirm' | 'player' | 'hidden' | 'grouped' | 'cards' | 'view';

function modeOf(choice: ChoicePending, options: ChoiceOption[]): Mode {
    if (choice.max === 0) return 'view';
    if (options.length > 0 && options.every((o) => o.id === 'yes' || o.id === 'no')) return 'confirm';
    if (options.some((o) => o.username !== undefined)) return 'player';
    if (options.some((o) => o.hidden)) return 'hidden';
    if (options.some((o) => o.ownerId)) return 'grouped';
    return 'cards';
}

/** Prompt texts come with player ids in `target`; show names instead. */
export function promptText(t: Dict, choice: ChoicePending, players: PlayersMap) {
    const raw = choice.params?.target;
    const target = raw != null ? players[String(raw)]?.username ?? String(raw) : '';
    const render = t.engine.prompts[choice.prompt];
    const kind = choice.params?.kind ? cardTypeLabel(t, String(choice.params.kind)) : '';
    const params = { card: String(choice.params?.card ?? choice.source?.cardName ?? ''), count: Number(choice.params?.count ?? choice.max), target, kind };
    return render ? render(params) : { title: choice.prompt, help: '' };
}

function useCountdown(remainingMs: number, key: string) {
    const [left, setLeft] = useState(remainingMs);
    useEffect(() => {
        const started = Date.now();
        setLeft(remainingMs);
        const id = setInterval(() => setLeft(Math.max(0, remainingMs - (Date.now() - started))), TICK_MS);
        return () => clearInterval(id);
    }, [remainingMs, key]);
    return left;
}

interface ChoiceSheetProps {
    choice: ChoicePending;
    players: PlayersMap;
    me: string;
    onAnswer: (choiceId: string, selection: string[], playerId?: string) => void;
    onPreview: (choiceId: string, selection: string[]) => void;
}

/**
 * Every player decision (targets, cards, yes/no), laid out like the design's targeting screen.
 * The other players see the same screen, read-only, with the chooser's marks moving live.
 */
function ChoiceSheet({ choice, players, me, onAnswer, onPreview }: ChoiceSheetProps) {
    const { t } = useI18n();
    const options = useMemo(() => choice.options ?? [], [choice.options]);
    const [picked, setPicked] = useState<string[]>([]);
    const left = useCountdown(choice.remainingMs, choice.choiceId);
    const mode = modeOf(choice, options);
    const copy = promptText(t, choice, players);
    const max = Math.min(choice.max, options.length);
    const spectator = choice.chooserId !== me;
    const chooserName = players[choice.chooserId]?.username ?? t.common.someone;
    const selected = spectator ? choice.preview ?? [] : picked;
    const ready = picked.length >= choice.min && picked.length <= max;

    useEffect(() => setPicked([]), [choice.choiceId]);

    // Mirror the marks to the table as they change (only on a real change, not on every render).
    const previewRef = useRef(onPreview);
    const lastSent = useRef(`${choice.choiceId}:`);
    useEffect(() => {
        previewRef.current = onPreview;
    }, [onPreview]);
    useEffect(() => {
        const key = `${choice.choiceId}:${picked.join(',')}`;
        if (spectator || key === lastSent.current) return;
        lastSent.current = key;
        previewRef.current(choice.choiceId, picked);
    }, [spectator, choice.choiceId, picked]);

    const toggle = (id: string) => {
        if (spectator) return;
        setPicked((prev) => {
            if (prev.includes(id)) return prev.filter((p) => p !== id);
            if (max === 1) return [id];
            return prev.length >= max ? prev : [...prev, id];
        });
    };
    const submit = (selection = picked) => onAnswer(choice.choiceId, selection, mode === 'player' ? selection[0] : undefined);

    if (mode === 'confirm') {
        if (spectator) return <ChoiceWaiting choice={choice} players={players} />;
        return (
            <div className="hts-overlay choice-overlay" role="dialog" aria-modal="true" aria-labelledby="choice-h">
                <div className="choice-confirm hts-panel hts-rise">
                    {choice.source && <GameCard card={choice.source} width={150} style={{ boxShadow: '0 0 0 3px #6fb4e8, 0 16px 30px rgba(0,0,0,.6)' }} />}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                        <span className="tg3-source">{choice.source?.cardName ? t.engine.choice.from(choice.source.cardName) : ''} · {Math.ceil(left / 1000)}s</span>
                        <h1 id="choice-h" className="hts-display" style={{ fontSize: 38 }}>{copy.title}</h1>
                        <p className="hts-muted" style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{copy.help}</p>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button type="button" className="tg3-back" onClick={() => submit(['no'])}>{t.engine.choice.no}</button>
                            <button type="button" className="tg3-confirm" onClick={() => submit(['yes'])}>{t.engine.choice.yes}</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const fromHero = choice.source?.type === 'HERO';
    const steps: [string, string][] = [
        ['done', fromHero ? t.engine.choice.steps.roll : t.engine.choice.steps.played],
        ['now', t.engine.choice.steps.choose],
        ['next', t.engine.choice.steps.resolve],
    ];
    const counter = t.engine.choice.chosen(selected.length, max);
    const confirmLabel = mode === 'view' ? t.engine.choice.ok : t.engine.choice.confirmLabels[choice.prompt] ?? t.engine.choice.confirm;
    const canConfirm = mode === 'view' || ready;

    return (
        <Stage label={copy.title} className="tg3">
            <img src={tableBackground} alt="" aria-hidden="true" className="tg3-bg" />
            <div className="tg3-shade" aria-hidden="true" />

            <header className="tg3-head">
                {choice.source && <GameCard card={choice.source} width={96} style={{ boxShadow: '0 0 0 3px #6fb4e8, 0 16px 30px rgba(0,0,0,.6)', flex: 'none' }} />}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {spectator && <span className="tg3-watching">{t.engine.choice.waiting(chooserName)}</span>}
                    <span className="tg3-source">{choice.source?.cardName ? t.engine.choice.from(choice.source.cardName) : t.target.cardEffect}</span>
                    <h1 className="tg3-title">{copy.title}</h1>
                    {mode !== 'view' && (
                        <ol className="tg3-steps">
                            {steps.map(([state, label], i) => <li key={label} className={`tg3-step tg3-step--${state}`}>{i + 1} · {label}</li>)}
                        </ol>
                    )}
                </div>
                <div className="tg3-timer" aria-label={t.common.timeLeft}>
                    <span className="hts-display">{Math.ceil(left / 1000)}</span>
                    {mode !== 'view' && !spectator && <span>{t.engine.choice.timeoutNote}</span>}
                </div>
            </header>

            {mode === 'grouped' && (
                <section className="tg3-groups">
                    {[...new Set(options.map((o) => o.ownerId ?? ''))].map((ownerId) => {
                        const owner = players[ownerId];
                        const info = classInfo(owner?.leader);
                        const mine = options.filter((o) => o.ownerId === ownerId);
                        return (
                            <div key={ownerId} className="tg3-group">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {info && <img src={info.leaderArt} alt="" className="tg3-avatar" />}
                                    <span style={{ fontWeight: 800, fontSize: 17 }}>{owner?.username}{ownerId === me ? t.common.youSuffix : ''}</span>
                                    <span style={{ fontSize: 13, color: '#b9b2a3' }}>{t.engine.choice.heroesOf(owner?.party?.length ?? 0)}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                                    {mine.map((o) => <HeroTarget key={o.id} option={o} on={selected.includes(o.id)} readOnly={spectator} onToggle={toggle} />)}
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}

            {mode === 'player' && (
                <section className="tg3-players" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(options.length, 2))}, minmax(0, 1fr))` }}>
                    {options.map((o) => {
                        const info = classInfo(o.leader);
                        const on = selected.includes(o.id);
                        return (
                            <button key={o.id} type="button" aria-pressed={on} disabled={spectator} className={`tg3-player ${on ? 'tg3-player--on' : ''}`} onClick={() => toggle(o.id)}>
                                {info && <img src={info.leaderArt} alt="" />}
                                <span className="tg3-player-name">{o.username}{o.id === me ? t.common.youSuffix : ''}</span>
                                <span className="tg3-player-stats">{t.engine.choice.handParty(o.handCount ?? 0, o.heroCount ?? 0)}</span>
                                {on && <span className="tg3-player-tag">{t.engine.choice.chosenTag}</span>}
                            </button>
                        );
                    })}
                </section>
            )}

            {mode === 'hidden' && <HiddenFan options={options} players={players} me={me} spectator={spectator} picked={selected} onToggle={toggle} />}

            {(mode === 'cards' || mode === 'view') && (
                <section className="tg3-cards">
                    {options.length === 0 && <p className="tg3-empty">{copy.help}</p>}
                    {options.map((o) => {
                        const on = selected.includes(o.id);
                        return (
                            <button key={o.id} type="button" className={`tg3-hero ${on ? 'tg3-hero--on' : ''}`} aria-pressed={on} disabled={mode === 'view' || spectator} onClick={() => toggle(o.id)}>
                                <GameCard card={o.card} width={150} />
                                {on && <Reticle />}
                            </button>
                        );
                    })}
                </section>
            )}

            <footer className="tg3-foot">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {mode !== 'view' && <span className={`tg3-counter ${selected.length > 0 ? 'tg3-counter--on' : ''}`}>{counter}</span>}
                    {options.length > 0 && <span className="tg3-help">{copy.help}</span>}
                </div>
                {spectator ? (
                    <span className="tg3-waiting">{t.engine.choice.waitingFor(chooserName)}</span>
                ) : (
                    <button type="button" className="tg3-confirm" disabled={!canConfirm} onClick={() => submit(mode === 'view' ? [] : picked)}>{confirmLabel}</button>
                )}
            </footer>
        </Stage>
    );
}

/** A Hero target with what goes along with it (equipped Item, curse). */
function HeroTarget({ option, on, readOnly, onToggle }: { option: ChoiceOption; on: boolean; readOnly: boolean; onToggle: (id: string) => void }) {
    const { t } = useI18n();
    const item = option.card?.item;
    return (
        <button type="button" className={`tg3-hero ${on ? 'tg3-hero--on' : ''}`} aria-pressed={on} aria-label={option.card?.cardName} disabled={readOnly} onClick={() => onToggle(option.id)}>
            <GameCard card={option.card ? { ...option.card, item: undefined } : option.card} width={120} />
            {on && <Reticle />}
            {item && <span className={`tg3-note ${item.cursed ? 'tg3-note--curse' : ''}`}>{t.engine.choice.itemGoes(item.cardName ?? '')}</span>}
        </button>
    );
}

function HiddenFan({ options, players, me, spectator, picked, onToggle }: {
    options: ChoiceOption[];
    players: PlayersMap;
    me: string;
    spectator: boolean;
    picked: string[];
    onToggle: (id: string) => void;
}) {
    const { t } = useI18n();
    const ownerId = options[0]?.ownerId ?? '';
    const owner = players[ownerId];
    const info = classInfo(owner?.leader);
    const count = options.length;
    // Face-down cards: from someone's hand (pulling, or watching a private pick) or from the deck.
    const title = owner ? t.engine.choice.handOf(ownerId === me ? t.common.you : owner.username, count) : t.engine.choice.cardsCount(count);
    const help = spectator ? t.engine.choice.secretHelp : t.engine.choice.hiddenHelp(owner?.username ?? '');
    const spacing = Math.min(118, 750 / Math.max(1, count - 1));
    return (
        <section className="tg3-hand" aria-label={title}>
            <div className="tg3-hand-head">
                {info && <img src={info.leaderArt} alt="" className="tg3-avatar" style={{ width: 40, height: 40 }} />}
                <span style={{ fontWeight: 800, fontSize: 16 }}>{title}</span>
                <span style={{ fontSize: 14, color: '#b9b2a3' }}>{help}</span>
            </div>
            <div className="tg3-fan">
                {options.map((o, i) => {
                    const off = i - (count - 1) / 2;
                    const on = picked.includes(o.id);
                    return (
                        <button
                            key={o.id}
                            type="button"
                            className="tg3-back-card"
                            aria-label={t.engine.choice.hiddenCard(i + 1)}
                            aria-pressed={on}
                            disabled={spectator}
                            onClick={() => onToggle(o.id)}
                            style={{
                                left: 375 + off * spacing,
                                top: 40 + off * off * 6 - (on ? 34 : 0),
                                transform: `rotate(${off * 5}deg)`,
                                boxShadow: on ? '0 0 0 4px #e9b949, 0 0 40px rgba(233,185,73,.5)' : '0 14px 28px rgba(0,0,0,.6)',
                            }}
                        >
                            <GameCard faceDown width={150} />
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

/** What everyone else sees while someone decides. */
export function ChoiceWaiting({ choice, players }: { choice: ChoicePending; players: PlayersMap }) {
    const { t } = useI18n();
    const name = players[choice.chooserId]?.username ?? t.common.someone;
    const copy = promptText(t, choice, players);
    return (
        <div className="status-banner choice-waiting" role="status">
            <b>{t.engine.choice.waiting(name)}</b>
            <span>{copy.title}</span>
        </div>
    );
}

export default ChoiceSheet;
