/**
 * Story dialogues and cutscene text for Chapter 1: The Sun.
 */
export const STORY_DATA = {
  chapter1: {
    title: 'Chapter 1: The Sun',
    subtitle: 'Child Hanuman jumps to the sun, thinking it is a mango.',

    intro: [
      {
        speaker: 'Child Hanuman',
        text: 'I am so hungry today... and Mother is not back yet.',
        cameraCue: 'lookAtSun',
      },
      {
        speaker: 'Child Hanuman',
        text: 'Wait! Look up there in the morning sky... Is that a giant, golden ripe mango?',
        cameraCue: 'zoomSun',
      },
      {
        speaker: 'Child Hanuman',
        text: 'It looks so sweet and juicy! If I climb to the high cliffs, I can leap up and catch it!',
        cameraCue: 'panToPlayer',
      },
    ],

    checkpointMessage: 'Checkpoint reached! Progress saved.',

    summit: [
      {
        speaker: 'Child Hanuman',
        text: 'The golden mango is right within my reach! Here I goooo!',
        cameraCue: 'summitFocus',
      },
    ],

    indraStrike: [
      {
        speaker: 'Narrator',
        text: 'Seeing the fearless child leaping to swallow the fiery Sun, King Indra hurled his celestial thunderbolt—the Vajra!',
        action: 'flashAndShake',
      },
      {
        speaker: 'Narrator',
        text: 'The divine lightning struck child Hanuman, sparing the sun and sending the young hero falling back to earth...',
        action: 'fallingHero',
      },
      {
        speaker: 'Narrator',
        text: 'Thus began the tale of the mighty Hanuman, blessed by the gods with boundless power and eternal spirit.',
        action: 'endStory',
      },
    ],

    endCard: {
      heading: 'Chapter 1 Complete',
      subheading: 'Child Hanuman & The Sun',
      summary: 'You reached the summit and leaped toward the celestial sun!',
      restartButton: 'Play Chapter 1 Again',
    },
  },
};
