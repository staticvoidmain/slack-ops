
/*
  chops should develop a personality.

*/

export enum Mood {
  "Happy",
  "Excited",
  "Optimistic",
  "Bored",
  "Curious",
  "Ambivalent",
  "Stressed",
  "Angry",
  "Confused",
  "Sad",
}

// function tokenize(input: string) { }

const faces = [
  { min: -99999, max: 0, icon: ":finnadie:" },
  { min: 1, max: 25, icon: ":goberserk:" },
  { min: 26, max: 50, icon: ":hurtrealbad:" },
  { min: 51, max: 75, icon: ":rage2:" },
  { min: 76, max: 99, icon: ":suspect:" },
  { min: 100, max: 105, icon: ":robot_face:" },
  { min: 106, max: 125, icon: ":full_moon_with_face:" },
  { min: 126, max: 99999, icon: ":sun_with_face:" },
];

export function getEmoji(user) {
  const emoji = faces.find((face) => {
    return user.karma >= face.min && user.karma <= face.max;
  });

  return emoji || { icon: "robot_face" };
}

let workload = 0;
export function updateWorkload(by: number) {
  workload += by;
}

export function command() {
  // running commands makes chops happy.
  // chops likes to stash user settings.
  // chops likes it when you talk to him like a person.
  // maybe the command succeeds, or maybe you should ask nicely.
}

export function greet(user) {
  // is chops glad to see you?
  const negative = [
    "Error, insufficient likeability",
    "Did you guys hear something?",
    "Fleshbag says what?",
  ];

  const neutral = [
    "Oh... you again.",
    "We meet again human.",
  ];

  const positive = [
    "Hi!",
    "Hey there!",
  ];
}

export function farewell(user) {
  const negative = [
    "Wow, I'm glad that's over...",
    "Overall chat quality ++",
    "That's right, walk away.",
  ];

  const neutral = [
    "Oh... you again.",
  ];

  const positive = [
    "Bye!",
  ];
}

export function joke() {
  // todo: this was a hackathon feature
}
