import { classAvatars } from "./ClassImages";

// Eagerly bundles every hero art file already dropped under
// src/ui/assets/heroes/<classe>/<classe><N>.png (e.g. bard1.png..bard8.png).
// Classes without art yet (see plans/here-to-slay-etapa2) fall back to the
// existing class-avatar image below.
const heroImages = import.meta.glob("../ui/assets/heroes/*/*.png", { eager: true, import: "default" }) as Record<string, string>;

// Index N (1-8) maps to a hero's position here, matching the declaration
// order in backend/.../entity/Card/CardFactory.java for that class.
const HERO_ORDER: Record<string, string[]> = {
    FIGHTER: ["Bad Axe", "Bear Claw", "Beary Wise", "Fury Knuckle", "Heavy Bear", "Pan Chucks", "Qi Bear", "Tough Teddy"],
    BARD: ["Dodgy Dealer", "Fuzzy Cheeks", "Greedy Cheeks", "Lucky Bucky", "Mellow Dee", "Napping Nibbles", "Peanut", "Tipsy Tootie"],
    GUARDIAN: ["Calming Voice", "Guiding Light", "Holy Curselifter", "Iron Resolve", "Mighty Blade", "Radiant Horn", "Vibrant Glow", "Wise Shield"],
    RANGER: ["Bullseye", "Hook", "Lookie Rookie", "Quick Draw", "Serious Grey", "Sharp Fox", "Wildshot", "Wily Red"],
    THIEF: ["Kit Napper", "Meowzio", "Plundering Puma", "Shurikitty", "Silent Shadow", "Slippery Paws", "Sly Pickings", "Smooth Mimimeow"],
    WIZARD: ["Bun Bun", "Buttons", "Fluffy", "Hopper", "Snowball", "Spooky", "Whiskers", "Wiggles"],
};

export function getHeroArt(heroClass?: string, heroName?: string): string {
    if (!heroClass) return "";
    const order = HERO_ORDER[heroClass];
    const index = order && heroName ? order.indexOf(heroName) : -1;

    if (index >= 0) {
        const classLower = heroClass.toLowerCase();
        const path = `../ui/assets/heroes/${classLower}/${classLower}-${index + 1}.png`;
        if (heroImages[path]) return heroImages[path];
    }

    return classAvatars[heroClass] || "";
}
