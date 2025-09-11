import { Howl } from 'howler';
import diceRollSound from '../../ui/assets/sounds/dice-roll.mp3';
import ChallengeSound from '../../ui/assets/sounds/challenge.mp3';

const soundMap = {
    diceRoll: new Howl({
        src: [diceRollSound]
    }),
    // cardDraw: new Howl({ src: ['/assets/sounds/card-draw.mp3'] }),
    challenge: new Howl({ src: [ChallengeSound] })
};

export type SoundType = keyof typeof soundMap;

export const playSound = (sound: SoundType) => {
    console.log(`Playing sound: ${sound}`);
    if (soundMap[sound]) {
        soundMap[sound].play();
    }
};