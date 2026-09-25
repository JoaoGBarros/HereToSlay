import { useEffect, useState } from 'react';
import { CLASS_IDS, CLASS_INFO, type HeroClassId } from '@/utils/ClassInfo';
import { playClassSound, type ClassSoundType } from '@/utils/SoundManager/SoundManager';
import { useI18n } from '@/i18n';
import type { PlayersMap } from '../../common/types';
import './screens.css';

interface LeaderDraftScreenProps {
    players: PlayersMap;
    me: string;
    turn: string;
    order: string[];
    available: string[];
    onChoose: (leader: string) => void;
}

function LeaderDraftScreen({ players, me, turn, order, available, onChoose }: LeaderDraftScreenProps) {
    const { t } = useI18n();
    const isMyPick = turn === me && !players[me]?.leader;
    const [picked, setPicked] = useState<HeroClassId>(() => (available[0] as HeroClassId) || 'WIZARD');

    useEffect(() => {
        if (!available.includes(picked) && available.length > 0) {
            setPicked(available[0] as HeroClassId);
        }
    }, [available, picked]);

    const takenBy = (id: string) => Object.values(players).find((p) => p.leader === id)?.username;
    const info = CLASS_INFO[picked];
    const text = t.classes[picked];
    const canConfirm = isMyPick && available.includes(picked);
    const picker = players[turn]?.username;

    function preview(id: HeroClassId) {
        setPicked(id);
        playClassSound(id as ClassSoundType);
    }

    return (
        <section className="prep-screen" aria-labelledby="draft-h">
            <header className="prep-header">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="hts-label">{t.draft.kicker}</span>
                    <h1 id="draft-h" className="hts-display" style={{ fontSize: 50 }}>{t.draft.title}</h1>
                </div>
                <span className={`hts-chip ${isMyPick ? 'hts-chip--gold' : 'hts-chip--muted'}`} role="status">
                    {isMyPick ? t.draft.myTurn : picker ? t.draft.picking(picker) : t.draft.waiting}
                </span>
            </header>

            <div className="draft-order hts-panel" aria-label={t.draft.orderAria}>
                <span className="hts-label" style={{ marginRight: 6 }}>{t.draft.order}</span>
                {order.map((pid, i) => {
                    const p = players[pid];
                    if (!p) return null;
                    const current = pid === turn && !p.leader;
                    return (
                        <div key={pid} className={`draft-order-item ${current ? 'draft-order-item--now' : ''}`}>
                            <span className="hts-display" style={{ fontSize: 20, color: 'var(--hts-dim)' }}>{i + 1}º</span>
                            <span className="draft-die hts-display">{p.orderRoll ?? '–'}</span>
                            <div style={{ lineHeight: 1.15 }}>
                                <div style={{ fontWeight: 800, fontSize: 15 }}>{p.username}{pid === me ? t.common.youSuffix : ''}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: current ? 'var(--hts-gold-text)' : 'var(--hts-muted)' }}>
                                    {p.leader ? t.draft.chose(t.classes[p.leader as HeroClassId]?.label ?? p.leader) : current ? t.draft.pickingNow : t.draft.waits}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="draft-main">
                <div role="radiogroup" aria-label={t.draft.leadersAria} className="draft-grid">
                    {CLASS_IDS.map((id) => {
                        const owner = takenBy(id);
                        const unavailable = !available.includes(id);
                        const selected = picked === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={`${CLASS_INFO[id].leaderName}: ${t.classes[id].label}${unavailable ? t.draft.unavailableSuffix : ''}`}
                                className={`draft-card ${selected ? 'draft-card--on' : ''} ${unavailable ? 'draft-card--off' : ''}`}
                                onClick={() => preview(id)}
                            >
                                <img src={CLASS_INFO[id].leaderArt} alt="" />
                                {unavailable && <span className="draft-card-tag">{owner ? t.draft.takenBy(owner) : t.draft.unavailable}</span>}
                            </button>
                        );
                    })}
                </div>

                <section className="draft-detail hts-panel" aria-live="polite">
                    <img src={info.leaderArt} alt={info.leaderName} className="draft-detail-art" />
                    <div className="draft-detail-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={info.icon} alt="" style={{ width: 34, height: 34, borderRadius: '50%' }} />
                            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1.2, textTransform: 'uppercase', color: info.tint }}>{text.label}</span>
                        </div>
                        <h2 className="hts-display" style={{ fontSize: 42 }}>{info.leaderName}</h2>
                        <div className="draft-skill">
                            <span className="hts-label" style={{ color: '#7a6a52' }}>{t.draft.skill}</span>
                            <p>{text.skill}</p>
                        </div>
                        <ul className="draft-notes">
                            {t.draft.notes.map((note) => <li key={note}>{note}</li>)}
                        </ul>
                        <button type="button" className="hts-btn" style={{ marginTop: 'auto', height: 60, fontSize: 26 }} disabled={!canConfirm} onClick={() => onChoose(picked)}>
                            {isMyPick ? t.draft.lead(text.label) : t.draft.waitTurn}
                        </button>
                    </div>
                </section>
            </div>
        </section>
    );
}

export default LeaderDraftScreen;
