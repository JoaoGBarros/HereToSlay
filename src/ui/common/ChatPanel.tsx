import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n';
import './chat.css';

export interface ChatMessage {
    playerId: string;
    username: string;
    text: string;
    timestamp: number;
}

export const CHAT_MAX_LENGTH = 200;

interface ChatPanelProps {
    messages: ChatMessage[];
    me: string;
    colorFor: (playerId: string) => string;
    onSend: (text: string) => void;
    title?: string;
    subtitle?: string;
    phrases?: string[];
    autoFocus?: boolean;
    onClose?: () => void;
}

/** Player chat used in the lobby and in the match. The server sanitizes and rate limits. */
export function ChatPanel({ messages, me, colorFor, onSend, title, subtitle, phrases, autoFocus, onClose }: ChatPanelProps) {
    const { t } = useI18n();
    const heading = title ?? t.chat.title;
    const quick = phrases ?? t.chat.lobbyPhrases;
    const [draft, setDraft] = useState('');
    const listRef = useRef<HTMLOListElement>(null);

    useEffect(() => {
        const list = listRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [messages.length]);

    function send(text: string) {
        const clean = text.trim();
        if (!clean) return;
        onSend(clean.slice(0, CHAT_MAX_LENGTH));
        setDraft('');
    }

    return (
        <section className="chat" aria-label={heading}>
            <header className="chat-head">
                <h2 className="hts-display" style={{ fontSize: 26 }}>{heading}</h2>
                {subtitle && <span className="hts-muted" style={{ fontSize: 13 }}>{subtitle}</span>}
                {onClose && <button type="button" className="hts-icon-btn" aria-label={t.chat.close} onClick={onClose}>✕</button>}
            </header>
            <ol ref={listRef} className="chat-list hts-scroll" aria-live="polite">
                {messages.length === 0 && <li className="chat-empty">{t.chat.empty}</li>}
                {messages.map((m) => (
                    <li key={`${m.timestamp}-${m.playerId}`} className={`chat-msg ${m.playerId === me ? 'chat-msg--me' : ''}`}>
                        <span className="chat-who" style={{ color: colorFor(m.playerId) }}>{m.playerId === me ? t.common.you : m.username}</span>
                        <span className="chat-text">{m.text}</span>
                    </li>
                ))}
            </ol>
            <div className="chat-compose">
                <div className="chat-phrases">
                    {quick.map((p) => (
                        <button key={p} type="button" className="chat-phrase" onClick={() => send(p)}>{p}</button>
                    ))}
                </div>
                <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
                    <label htmlFor="chat-input" className="sr-only">{t.chat.message}</label>
                    <input
                        id="chat-input"
                        className="hts-input chat-input"
                        type="text"
                        autoComplete="off"
                        maxLength={CHAT_MAX_LENGTH}
                        placeholder={t.chat.placeholder}
                        autoFocus={autoFocus}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                    />
                    <button type="submit" className="chat-send" aria-label={t.chat.send} disabled={!draft.trim()}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                </form>
            </div>
        </section>
    );
}

/** Appends a message, ignoring duplicates (history and live messages can overlap). */
export function appendChat(list: ChatMessage[], message: ChatMessage, limit = 60): ChatMessage[] {
    if (list.some((m) => m.timestamp === message.timestamp && m.playerId === message.playerId)) return list;
    return [...list, message].slice(-limit);
}
