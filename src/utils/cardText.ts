import type { Lang } from '@/i18n';

/** Keywords exactly as printed on the cards. Their meaning is translated in the dictionaries (engine.keywords). */
export type Keyword =
    | 'DRAW' | 'DISCARD' | 'DESTROY' | 'STEAL' | 'SACRIFICE' | 'PULL' | 'PLAY' | 'SEARCH'
    | 'TRADE' | 'LOOK' | 'PROTECT' | 'ROLL' | 'RETURN' | 'MASK' | 'CURSED' | 'SLAY' | 'CHALLENGE' | 'MODIFIER';

interface Text {
    pt: string;
    en: string;
    es: string;
}

interface CardText extends Text {
    kw: Keyword[];
}

const c = (kw: Keyword[], en: string, pt: string, es: string): CardText => ({ kw, en, pt, es });

/** Effect text of every Hero, Magic and Item card (from the card list), keyed by card name. */
const CARD_TEXT: Record<string, CardText> = {
    // ---------- Fighter ----------
    'Bad Axe': c(['DESTROY'], 'DESTROY a Hero card.', 'DESTRUA uma carta de Herói.', 'DESTRUYE una carta de Héroe.'),
    'Bear Claw': c(['PULL'], "PULL a card from another player's hand. If it is a Hero card, PULL a second card from that player's hand.", 'PUXE uma carta da mão de outro jogador. Se for um Herói, PUXE uma segunda carta da mão desse jogador.', 'TOMA una carta de la mano de otro jugador. Si es un Héroe, TOMA una segunda carta de su mano.'),
    'Beary Wise': c(['DISCARD'], 'Each other player must DISCARD a card. Choose one of the discarded cards and add it to your hand.', 'Cada outro jogador DESCARTA uma carta. Escolha uma das cartas descartadas e coloque na sua mão.', 'Cada otro jugador DESCARTA una carta. Elige una de las descartadas y añádela a tu mano.'),
    'Fury Knuckle': c(['PULL', 'CHALLENGE'], "PULL a card from another player's hand. If it is a Challenge card, PULL a second card from that player's hand.", 'PUXE uma carta da mão de outro jogador. Se for um Desafio, PUXE uma segunda carta da mão desse jogador.', 'TOMA una carta de la mano de otro jugador. Si es un Desafío, TOMA una segunda carta de su mano.'),
    'Heavy Bear': c(['DISCARD'], 'Choose a player. That player must DISCARD 2 cards.', 'Escolha um jogador. Ele DESCARTA 2 cartas.', 'Elige a un jugador. Ese jugador DESCARTA 2 cartas.'),
    'Pan Chucks': c(['DRAW', 'CHALLENGE', 'DESTROY'], 'DRAW 2 cards. If at least one is a Challenge card, you may reveal it, then DESTROY a Hero card.', 'COMPRE 2 cartas. Se ao menos uma for Desafio, você pode revelá-la e DESTRUIR um Herói.', 'ROBA 2 cartas. Si al menos una es un Desafío, puedes revelarla y DESTRUIR un Héroe.'),
    'Qi Bear': c(['DISCARD', 'DESTROY'], 'DISCARD up to 3 cards. For each card discarded, DESTROY a Hero card.', 'DESCARTE até 3 cartas. Para cada carta descartada, DESTRUA um Herói.', 'DESCARTA hasta 3 cartas. Por cada carta descartada, DESTRUYE un Héroe.'),
    'Tough Teddy': c(['DISCARD'], 'Each other player with a Fighter in their Party must DISCARD a card.', 'Cada outro jogador com um Lutador no grupo DESCARTA uma carta.', 'Cada otro jugador con un Luchador en su grupo DESCARTA una carta.'),
    // ---------- Bard ----------
    'Dodgy Dealer': c(['TRADE'], 'Trade hands with another player.', 'Troque de mão com outro jogador.', 'Intercambia tu mano con otro jugador.'),
    'Fuzzy Cheeks': c(['DRAW', 'PLAY'], 'DRAW a card and play a Hero card from your hand immediately.', 'COMPRE uma carta e jogue imediatamente um Herói da sua mão.', 'ROBA una carta y juega inmediatamente un Héroe de tu mano.'),
    'Greedy Cheeks': c(['PULL'], 'Each other player must give you a card from their hand.', 'Cada outro jogador te dá uma carta da mão dele.', 'Cada otro jugador te da una carta de su mano.'),
    'Lucky Bucky': c(['PULL', 'PLAY'], "PULL a card from another player's hand. If it is a Hero card, you may play it immediately.", 'PUXE uma carta da mão de outro jogador. Se for um Herói, você pode jogá-lo imediatamente.', 'TOMA una carta de la mano de otro jugador. Si es un Héroe, puedes jugarlo inmediatamente.'),
    'Mellow Dee': c(['DRAW', 'PLAY'], 'DRAW a card. If it is a Hero card, you may play it immediately.', 'COMPRE uma carta. Se for um Herói, você pode jogá-lo imediatamente.', 'ROBA una carta. Si es un Héroe, puedes jugarlo inmediatamente.'),
    'Napping Nibbles': c([], 'Do nothing.', 'Não faz nada.', 'No hace nada.'),
    Peanut: c(['DRAW'], 'DRAW 2 cards.', 'COMPRE 2 cartas.', 'ROBA 2 cartas.'),
    'Tipsy Tootie': c(['STEAL'], "Choose a player. STEAL a Hero card from that player's Party and move this card to their Party.", 'Escolha um jogador. ROUBE um Herói do grupo dele e mova esta carta para o grupo dele.', 'Elige a un jugador. ROBA un Héroe de su grupo y mueve esta carta a su grupo.'),
    // ---------- Guardian ----------
    'Calming Voice': c(['PROTECT', 'STEAL'], 'Hero cards in your Party cannot be stolen until your next turn.', 'Seus Heróis não podem ser ROUBADOS até o seu próximo turno.', 'Tus Héroes no pueden ser ROBADOS hasta tu próximo turno.'),
    'Guiding Light': c(['SEARCH'], 'Search the discard pile for a Hero card and add it to your hand.', 'Procure um Herói na pilha de descarte e coloque na sua mão.', 'Busca un Héroe en la pila de descarte y añádelo a tu mano.'),
    'Holy Curselifter': c(['RETURN', 'CURSED'], 'Return a Cursed Item card equipped to a Hero card in your Party to your hand.', 'Devolva para a sua mão um Item amaldiçoado equipado num Herói do seu grupo.', 'Devuelve a tu mano un Objeto maldito equipado en un Héroe de tu grupo.'),
    'Iron Resolve': c(['PROTECT', 'CHALLENGE'], 'Cards you play cannot be challenged for the rest of your turn.', 'As cartas que você jogar não podem ser DESAFIADAS pelo resto do turno.', 'Las cartas que juegues no pueden ser DESAFIADAS el resto del turno.'),
    'Mighty Blade': c(['PROTECT', 'DESTROY'], 'Hero cards in your Party cannot be destroyed until your next turn.', 'Seus Heróis não podem ser DESTRUÍDOS até o seu próximo turno.', 'Tus Héroes no pueden ser DESTRUIDOS hasta tu próximo turno.'),
    'Radiant Horn': c(['SEARCH', 'MODIFIER'], 'Search the discard pile for a Modifier card and add it to your hand.', 'Procure um Modificador na pilha de descarte e coloque na sua mão.', 'Busca un Modificador en la pila de descarte y añádelo a tu mano.'),
    'Vibrant Glow': c(['ROLL'], '+5 to all of your rolls until the end of your turn.', '+5 em todas as suas rolagens até o fim do turno.', '+5 a todas tus tiradas hasta el final de tu turno.'),
    'Wise Shield': c(['ROLL'], '+3 to all of your rolls until the end of your turn.', '+3 em todas as suas rolagens até o fim do turno.', '+3 a todas tus tiradas hasta el final de tu turno.'),
    // ---------- Ranger ----------
    Bullseye: c(['LOOK'], 'Look at the top 3 cards of the deck. Add one to your hand, then return the other two to the top of the deck in any order.', 'Olhe as 3 cartas do topo do baralho. Fique com uma e devolva as outras duas ao topo na ordem que quiser.', 'Mira las 3 cartas superiores del mazo. Quédate una y devuelve las otras dos arriba en el orden que quieras.'),
    Hook: c(['PLAY', 'DRAW'], 'Play an Item card from your hand immediately and DRAW a card.', 'Jogue imediatamente um Item da sua mão e COMPRE uma carta.', 'Juega inmediatamente un Objeto de tu mano y ROBA una carta.'),
    'Lookie Rookie': c(['SEARCH'], 'Search the discard pile for an Item card and add it to your hand.', 'Procure um Item na pilha de descarte e coloque na sua mão.', 'Busca un Objeto en la pila de descarte y añádelo a tu mano.'),
    'Quick Draw': c(['DRAW', 'PLAY'], 'DRAW 2 cards. If at least one is an Item card, you may play one of them immediately.', 'COMPRE 2 cartas. Se ao menos uma for Item, você pode jogar uma delas imediatamente.', 'ROBA 2 cartas. Si al menos una es un Objeto, puedes jugar una inmediatamente.'),
    'Serious Grey': c(['DESTROY', 'DRAW'], 'DESTROY a Hero card and DRAW a card.', 'DESTRUA um Herói e COMPRE uma carta.', 'DESTRUYE un Héroe y ROBA una carta.'),
    'Sharp Fox': c(['LOOK'], "Look at another player's hand.", 'Olhe a mão de outro jogador.', 'Mira la mano de otro jugador.'),
    Wildshot: c(['DRAW', 'DISCARD'], 'DRAW 3 cards and DISCARD a card.', 'COMPRE 3 cartas e DESCARTE uma.', 'ROBA 3 cartas y DESCARTA una.'),
    'Wily Red': c(['DRAW'], 'DRAW cards until you have 7 cards in your hand.', 'COMPRE até ter 7 cartas na mão.', 'ROBA hasta tener 7 cartas en la mano.'),
    // ---------- Thief ----------
    'Kit Napper': c(['STEAL'], 'STEAL a Hero card.', 'ROUBE um Herói.', 'ROBA un Héroe.'),
    Meowzio: c(['STEAL', 'PULL'], "Choose a player. STEAL a Hero card from that player's Party and PULL a card from their hand.", 'Escolha um jogador. ROUBE um Herói do grupo dele e PUXE uma carta da mão dele.', 'Elige a un jugador. ROBA un Héroe de su grupo y TOMA una carta de su mano.'),
    'Plundering Puma': c(['PULL', 'DRAW'], "PULL 2 cards from another player's hand. That player may DRAW a card.", 'PUXE 2 cartas da mão de outro jogador. Esse jogador pode COMPRAR uma carta.', 'TOMA 2 cartas de la mano de otro jugador. Ese jugador puede ROBAR una carta.'),
    Shurikitty: c(['DESTROY'], 'DESTROY a Hero card. If that Hero card had an Item card equipped, add the Item card to your hand instead of the discard pile.', 'DESTRUA um Herói. Se ele tinha um Item equipado, o Item vai para a sua mão em vez do descarte.', 'DESTRUYE un Héroe. Si tenía un Objeto equipado, añádelo a tu mano en lugar del descarte.'),
    'Silent Shadow': c(['LOOK'], "Look at another player's hand. Choose a card and add it to your hand.", 'Olhe a mão de outro jogador. Escolha uma carta e coloque na sua mão.', 'Mira la mano de otro jugador. Elige una carta y añádela a tu mano.'),
    'Slippery Paws': c(['PULL', 'DISCARD'], "PULL 2 cards from another player's hand, then DISCARD one of those cards.", 'PUXE 2 cartas da mão de outro jogador e DESCARTE uma delas.', 'TOMA 2 cartas de la mano de otro jugador y DESCARTA una de ellas.'),
    'Sly Pickings': c(['PULL', 'PLAY'], "PULL a card from another player's hand. If it is an Item card, you may play it immediately.", 'PUXE uma carta da mão de outro jogador. Se for um Item, você pode jogá-lo imediatamente.', 'TOMA una carta de la mano de otro jugador. Si es un Objeto, puedes jugarlo inmediatamente.'),
    'Smooth Mimimeow': c(['PULL'], 'PULL a card from the hand of each other player with a Thief in their Party.', 'PUXE uma carta da mão de cada outro jogador com um Ladino no grupo.', 'TOMA una carta de la mano de cada otro jugador con un Ladrón en su grupo.'),
    // ---------- Wizard ----------
    'Bun Bun': c(['SEARCH'], 'Search the discard pile for a Magic card and add it to your hand.', 'Procure uma Magia na pilha de descarte e coloque na sua mão.', 'Busca una Magia en la pila de descarte y añádela a tu mano.'),
    Buttons: c(['PULL', 'PLAY'], "PULL a card from another player's hand. If it is a Magic card, you may play it immediately.", 'PUXE uma carta da mão de outro jogador. Se for uma Magia, você pode jogá-la imediatamente.', 'TOMA una carta de la mano de otro jugador. Si es una Magia, puedes jugarla inmediatamente.'),
    Fluffy: c(['DESTROY'], 'DESTROY 2 Hero cards.', 'DESTRUA 2 Heróis.', 'DESTRUYE 2 Héroes.'),
    Hopper: c(['SACRIFICE'], 'Choose a player. That player must SACRIFICE a Hero card.', 'Escolha um jogador. Ele SACRIFICA um Herói.', 'Elige a un jugador. Ese jugador SACRIFICA un Héroe.'),
    Snowball: c(['DRAW', 'PLAY'], 'DRAW a card. If it is a Magic card, you may play it immediately and DRAW a second card.', 'COMPRE uma carta. Se for uma Magia, você pode jogá-la imediatamente e COMPRAR uma segunda carta.', 'ROBA una carta. Si es una Magia, puedes jugarla inmediatamente y ROBAR una segunda carta.'),
    Spooky: c(['SACRIFICE'], 'Each other player must SACRIFICE a Hero card.', 'Cada outro jogador SACRIFICA um Herói.', 'Cada otro jugador SACRIFICA un Héroe.'),
    Whiskers: c(['STEAL', 'DESTROY'], 'STEAL a Hero card and DESTROY a Hero card.', 'ROUBE um Herói e DESTRUA um Herói.', 'ROBA un Héroe y DESTRUYE un Héroe.'),
    Wiggles: c(['STEAL', 'ROLL'], "STEAL a Hero card and roll to use its effect immediately.", 'ROUBE um Herói e role para usar o efeito dele imediatamente.', 'ROBA un Héroe y tira para usar su efecto inmediatamente.'),
    // ---------- Magic ----------
    'Call to the Fallen': c(['SEARCH'], 'Search the discard pile for a Hero card and add it to your hand.', 'Procure um Herói na pilha de descarte e coloque na sua mão.', 'Busca un Héroe en la pila de descarte y añádelo a tu mano.'),
    'Critical Boost': c(['DRAW', 'DISCARD'], 'DRAW 3 cards and DISCARD a card.', 'COMPRE 3 cartas e DESCARTE uma.', 'ROBA 3 cartas y DESCARTA una.'),
    'Destructive Spell': c(['DISCARD', 'DESTROY'], 'DISCARD a card, then DESTROY a Hero card.', 'DESCARTE uma carta e depois DESTRUA um Herói.', 'DESCARTA una carta y luego DESTRUYE un Héroe.'),
    'Enchanted Spell': c(['ROLL'], '+2 to all of your rolls until the end of your turn.', '+2 em todas as suas rolagens até o fim do turno.', '+2 a todas tus tiradas hasta el final de tu turno.'),
    'Entangling Trap': c(['DISCARD', 'STEAL'], 'DISCARD 2 cards, then STEAL a Hero card.', 'DESCARTE 2 cartas e depois ROUBE um Herói.', 'DESCARTA 2 cartas y luego ROBA un Héroe.'),
    'Forced Exchange': c(['STEAL'], "Choose a player. STEAL a Hero card from that player's Party, then move a Hero card from your Party to theirs.", 'Escolha um jogador. ROUBE um Herói do grupo dele e depois passe um Herói seu para o grupo dele.', 'Elige a un jugador. ROBA un Héroe de su grupo y luego mueve un Héroe tuyo a su grupo.'),
    'Forceful Winds': c(['RETURN'], "Return every equipped Item card to its player's hand.", 'Todos os Itens equipados voltam para a mão de seus jogadores.', 'Todos los Objetos equipados vuelven a la mano de sus jugadores.'),
    'Winds of Change': c(['RETURN', 'DRAW'], "Return an equipped Item card to its player's hand, then DRAW a card.", 'Devolva um Item equipado para a mão do seu jogador e COMPRE uma carta.', 'Devuelve un Objeto equipado a la mano de su jugador y ROBA una carta.'),
    // ---------- Items ----------
    'Decoy Doll': c([], 'If the equipped Hero card would be sacrificed or destroyed, move Decoy Doll to the discard pile instead.', 'Se o Herói equipado for sacrificado ou destruído, a Decoy Doll vai para o descarte no lugar dele.', 'Si el Héroe equipado fuera sacrificado o destruido, Decoy Doll va al descarte en su lugar.'),
    'Particularly Rusty Coin': c(['DRAW'], "If you unsuccessfully roll for the equipped Hero card's effect, DRAW a card.", 'Se a rolagem do efeito do Herói equipado falhar, COMPRE uma carta.', 'Si fallas la tirada del efecto del Héroe equipado, ROBA una carta.'),
    'Really Big Ring': c(['ROLL'], "Each time you roll for the equipped Hero card's effect, +2 to your roll.", 'Cada vez que rolar para o efeito do Herói equipado, +2 na rolagem.', 'Cada vez que tires por el efecto del Héroe equipado, +2 a la tirada.'),
    "Curse of the Snake's Eyes": c(['CURSED', 'ROLL'], "Each time you roll for the equipped Hero card's effect, −2 to your roll.", 'Cada vez que rolar para o efeito do Herói equipado, −2 na rolagem.', 'Cada vez que tires por el efecto del Héroe equipado, −2 a la tirada.'),
    'Sealing Key': c(['CURSED'], "You cannot use the equipped Hero card's effect.", 'O efeito do Herói equipado não pode ser usado.', 'No puedes usar el efecto del Héroe equipado.'),
    'Suspiciously Shiny Coin': c(['CURSED', 'DISCARD'], "If you successfully roll for the equipped Hero card's effect, DISCARD a card.", 'Se a rolagem do efeito do Herói equipado der certo, DESCARTE uma carta.', 'Si la tirada del efecto del Héroe equipado sale bien, DESCARTA una carta.'),
};

const MASK_CLASS: Record<string, Text> = {
    Bard: { en: 'Bard', pt: 'Bardo', es: 'Bardo' },
    Fighter: { en: 'Fighter', pt: 'Lutador', es: 'Luchador' },
    Guardian: { en: 'Guardian', pt: 'Guardião', es: 'Guardián' },
    Ranger: { en: 'Ranger', pt: 'Patrulheiro', es: 'Explorador' },
    Thief: { en: 'Thief', pt: 'Ladino', es: 'Ladrón' },
    Wizard: { en: 'Wizard', pt: 'Mago', es: 'Mago' },
};

function maskText(name: string): CardText | null {
    const cls = MASK_CLASS[name.replace(' Mask', '')];
    if (!name.endsWith(' Mask') || !cls) return null;
    return c(['MASK'],
        `The equipped Hero card counts as a ${cls.en} instead of its original class.`,
        `O Herói equipado passa a contar como ${cls.pt} no lugar da classe original.`,
        `El Héroe equipado cuenta como ${cls.es} en lugar de su clase original.`);
}

function modifierText(card: { cardName?: string; possibleValues?: number[] }): CardText {
    const values = (card.possibleValues ?? []).map((v) => (v > 0 ? `+${v}` : `−${Math.abs(v)}`)).join(' / ');
    return c(['MODIFIER'],
        `Play on any roll, without spending action points: ${values}. If there are two values, you choose one.`,
        `Jogue em qualquer rolagem, sem gastar pontos de ação: ${values}. Se houver dois valores, você escolhe um.`,
        `Juega en cualquier tirada, sin gastar puntos de acción: ${values}. Si hay dos valores, eliges uno.`);
}

const CHALLENGE_TEXT = c(['CHALLENGE'],
    'Play when another player plays a Hero, Item or Magic card. Both roll; if you roll equal or higher, that card goes to the discard pile.',
    'Jogue quando outro jogador jogar um Herói, Item ou Magia. Os dois rolam; se você tirar igual ou mais, a carta vai para o descarte.',
    'Juega cuando otro jugador juegue un Héroe, Objeto o Magia. Ambos tiran; si sacas igual o más, esa carta va al descarte.');

export function cardText(card: { cardName?: string; type?: string; possibleValues?: number[] }): CardText | null {
    const name = card.cardName ?? '';
    if (card.type === 'MODIFIER') return modifierText(card);
    if (card.type === 'CHALLENGE') return CHALLENGE_TEXT;
    return CARD_TEXT[name] ?? maskText(name);
}

export function textIn(text: Text, lang: Lang): string {
    return text[lang];
}

/** Passive ability gained by slaying each monster. */
export const MONSTER_REWARD: Record<string, Text> = {
    ABYSS_QUEEN: { en: 'Each time another player plays a Modifier card on one of your rolls, +1 to your roll.', pt: 'Cada vez que outro jogador jogar um Modificador numa rolagem sua, +1 nessa rolagem.', es: 'Cada vez que otro jugador juegue un Modificador en una tirada tuya, +1 a esa tirada.' },
    ANURAN_CAULDRON: { en: "Each time you roll to use a Hero card's effect, +1 to your roll.", pt: 'Cada vez que rolar para usar o efeito de um Herói, +1 na rolagem.', es: 'Cada vez que tires para usar el efecto de un Héroe, +1 a la tirada.' },
    ARTIC_ARIES: { en: "Each time you successfully roll to use a Hero card's effect, DRAW a card.", pt: 'Cada vez que a rolagem do efeito de um Herói der certo, COMPRE uma carta.', es: 'Cada vez que la tirada del efecto de un Héroe salga bien, ROBA una carta.' },
    BLOODWING: { en: 'Each time another player challenges you, that player must DISCARD a card.', pt: 'Cada vez que alguém te DESAFIAR, essa pessoa DESCARTA uma carta.', es: 'Cada vez que alguien te DESAFÍE, esa persona DESCARTA una carta.' },
    CORRUPTED_SABRETOOTH: { en: 'Each time you would DESTROY a Hero card, you may STEAL that Hero card instead.', pt: 'Cada vez que você for DESTRUIR um Herói, pode ROUBÁ-LO em vez disso.', es: 'Cada vez que fueras a DESTRUIR un Héroe, puedes ROBARLO en su lugar.' },
    CROWNED_SERPENT: { en: 'Each time any player plays a Modifier card, you may DRAW a card.', pt: 'Cada vez que qualquer jogador jogar um Modificador, você COMPRA uma carta.', es: 'Cada vez que cualquier jugador juegue un Modificador, ROBAS una carta.' },
    DARK_DRAGON_KING: { en: '+1 to all of your rolls.', pt: '+1 em todas as suas rolagens.', es: '+1 a todas tus tiradas.' },
    DRACOS: { en: 'Each time a Hero card in your Party is destroyed, DRAW a card.', pt: 'Cada vez que um Herói do seu grupo for destruído, COMPRE uma carta.', es: 'Cada vez que un Héroe de tu grupo sea destruido, ROBA una carta.' },
    MALAMAMMOTH: { en: 'Each time you DRAW an Item card, you may play it immediately.', pt: 'Cada vez que COMPRAR um Item, você pode jogá-lo imediatamente.', es: 'Cada vez que ROBES un Objeto, puedes jugarlo inmediatamente.' },
    MEGA_SLIME: { en: '+1 action point on each of your turns.', pt: '+1 ponto de ação em cada turno seu.', es: '+1 punto de acción en cada uno de tus turnos.' },
    ORTHUS: { en: 'Each time you DRAW a Magic card, you may play it immediately.', pt: 'Cada vez que COMPRAR uma Magia, você pode jogá-la imediatamente.', es: 'Cada vez que ROBES una Magia, puedes jugarla inmediatamente.' },
    REX_MAJOR: { en: 'Each time you DRAW a Modifier card, DRAW an extra card.', pt: 'Cada vez que COMPRAR um Modificador, COMPRE mais uma carta.', es: 'Cada vez que ROBES un Modificador, ROBA una carta extra.' },
    TERRATUGA: { en: 'Your Hero cards cannot be destroyed.', pt: 'Seus Heróis não podem ser destruídos.', es: 'Tus Héroes no pueden ser destruidos.' },
    TITAN_WYVERN: { en: 'Each time you roll for a challenge, +1 to your roll.', pt: 'Cada vez que rolar num desafio, +1 na rolagem.', es: 'Cada vez que tires en un desafío, +1 a la tirada.' },
    WARWORN_OWLBEAR: { en: 'Item cards you play cannot be challenged.', pt: 'Os Itens que você jogar não podem ser desafiados.', es: 'Los Objetos que juegues no pueden ser desafiados.' },
};
