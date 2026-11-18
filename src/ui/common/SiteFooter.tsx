import './SiteFooter.css';

const SITE_URL = 'https://joaogbarros.com';
const BUY_URL = 'https://teeturtle.com/products/here-to-slay-base-game';

// External links never get a window.opener handle and never leak this page as the referrer.
// The store link also carries nofollow: this is a fan project, not an endorsement, so it
// should not pass link equity to the shop.
const EXTERNAL_REL = 'noopener noreferrer';
const BUY_REL = `${EXTERNAL_REL} nofollow`;

/**
 * Legal and attribution footer shown outside a match. The link opens in the player's browser:
 * the desktop build sends target="_blank" links to the system instead of navigating the game window.
 */
export function SiteFooter({ className }: { className?: string }) {
    return (
        <footer className={className ? `hts-footer ${className}` : 'hts-footer'}>
            <p className="hts-footer-legal">
                Non-commercial fan project. Here to Slay and its artwork belong to Unstable Games. Music and audio belong to their respective owners.
            </p>
            <div className="hts-footer-meta">
                <a
                    className="hts-footer-buy"
                    href={BUY_URL}
                    target="_blank"
                    rel={BUY_REL}
                    aria-label="Buy Here to Slay from Unstable Games"
                >
                    Buy the game
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                </a>
                <span className="hts-footer-credit">Made by João Barros</span>
                <a className="hts-footer-link" href={SITE_URL} target="_blank" rel={EXTERNAL_REL}>
                    Docs &amp; more at joaogbarros.com
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                </a>
            </div>
        </footer>
    );
}
