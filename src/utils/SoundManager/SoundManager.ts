import { Howl } from 'howler';
import diceRollSound from '../../ui/assets/sounds/dice-roll.mp3';
import ChallengeSound from '../../ui/assets/sounds/challenge.mp3';
import backgroundMusicFile from '../../ui/assets/sounds/base-music.mp3';
import bardSound from '../../ui/assets/sounds/class-sounds/bard.mp3';
import wizardSound from '../../ui/assets/sounds/class-sounds/wizard.mp3';
import rangerSound from '../../ui/assets/sounds/class-sounds/ranger.mp3';
import fighterSound from '../../ui/assets/sounds/class-sounds/fighter.mp3';
import guardianSound from '../../ui/assets/sounds/class-sounds/guardian.mp3';
import thiefSound from '../../ui/assets/sounds/class-sounds/thief.mp3';

const DUCK_VOLUME = 0.1;
const FADE_TIME = 300;

const backgroundMusic = new Howl({
    src: [backgroundMusicFile],
    loop: true,
    volume: 0.5,
    html5: true
});

let currentMusicVolume = 0.5;

export const playBackgroundMusic = () => {
    if (!backgroundMusic.playing()) {
        backgroundMusic.play();
    }
};

export const setMusicVolume = (volume: number) => {
    currentMusicVolume = volume;
    if (backgroundMusic.volume() > DUCK_VOLUME) { 
        backgroundMusic.volume(volume);
    }
};

const soundMap = {
    diceRoll: new Howl({
        src: [diceRollSound]
    }),
    // cardDraw: new Howl({ src: ['/assets/sounds/card-draw.mp3'] }),
    challenge: new Howl({ src: [ChallengeSound] })
};

const classSoundMap = {
    BARD: new Howl({ src: [bardSound] }),
    FIGHTER: new Howl({ src: [fighterSound] }),
    GUARDIAN: new Howl({ src: [guardianSound] }),
    RANGER: new Howl({ src: [rangerSound] }),
    THIEF: new Howl({ src: [thiefSound] }),
    WIZARD: new Howl({ src: [wizardSound] })
};


export type SoundType = keyof typeof soundMap;
export type ClassSoundType = keyof typeof classSoundMap;


export const playSound = (sound: SoundType) => {
    console.log(`Playing sound: ${sound}`);
    const sfx = soundMap[sound];
    if (sfx) {
        backgroundMusic.fade(currentMusicVolume, DUCK_VOLUME, FADE_TIME);
        sfx.play();
        sfx.on('end', () => {
            backgroundMusic.fade(DUCK_VOLUME, currentMusicVolume, FADE_TIME * 2);
        });
    }
};

export const playClassSound = (className: ClassSoundType) => {
    console.log(`Playing class sound: ${className}`);
    const sfx = classSoundMap[className];
    if (sfx) {
        backgroundMusic.fade(currentMusicVolume, DUCK_VOLUME, FADE_TIME);
        sfx.play();
        sfx.on('end', () => {
            backgroundMusic.fade(DUCK_VOLUME, currentMusicVolume, FADE_TIME * 2);
        });
    }
};