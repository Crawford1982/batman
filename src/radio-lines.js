// Text-only tactical cue; no recording is claimed or requested for this line.
export const GROUND_CONTACT =
  "GORDON / They've found you. Keep moving—drones are lining up an attack.";
export const RADIO_LINES = {
  "alfred-theatre": [
    "ALFRED",
    "The theatre district is deserted, sir, but those rooftops are not.",
  ],
  "alfred-railway": ["ALFRED", "The elevated railway will give you cover, keep the car moving."],
  "alfred-emp": ["ALFRED", "Their tracking signal has dropped, nicely done, sir."],
  "alfred-relay-down": ["ALFRED", "That relay is offline, their grip on the city is weakening."],
  "gordon-north": ["GORDON", "Head north into Old Gotham, we are keeping the shelter doors open."],
  "gordon-approach": ["GORDON", "We can hear your engine, bring the override to the front steps."],
  "gordon-hold": ["GORDON", "The families are holding on, just get that car here in one piece."],
  "gordon-last-wave": [
    "GORDON",
    "This is their last attack, hold the corridor and we can get everyone out.",
  ],

  "alfred-patrol": ["ALFRED", "The city is quiet, sir, take a moment to get your bearings."],
  "alfred-relays": ["ALFRED", "Attack source identified, disable the three red command relays."],
  "alfred-drive": ["ALFRED", "Take the override to the cathedral and follow the gold route."],
  "alfred-left": ["ALFRED", "Turn left at the junction, the corridor is clear."],
  "gordon-inbound": ["GORDON", "Bomber inbound, intercept it before it reaches the shelter."],
  "gordon-hit": ["GORDON", "The shelter has been hit, we cannot take much more of this."],
  "gordon-final": ["GORDON", "Relays are down, stop the last three bombers while we evacuate."],
  "gordon-safe": ["GORDON", "The override is accepted, heat is restored and our people are safe."],
  "batman-air": ["BATMAN", "I'm on it, keep those people moving."],
  "batman-drive": ["BATMAN", "Hold on, Gordon, I'm bringing the override."],
};

// Chapter III, part two (Kessler rooftops). Text-only captions; no recordings
// exist or are claimed for these lines, so they stay out of RADIO_LINES.
export const ROOFTOP_LINES = {
  briefing: [
    "ALFRED",
    "Kessler Cold Storage, sir. Three uplink dishes on these roofs still re-key the hijack carrier.",
  ],
  plan: ["BATMAN", "Dishes first. Then the flight log tells us who flew those aircraft."],
  start: [
    "ALFRED",
    "Grapple across the gaps. Stay out of their sight lines; vents and plant rooms give cover.",
  ],
  uplink: ["ALFRED", "That dish has gone dark."],
  uplinksDone: [
    "ALFRED",
    "The carrier is silent. The control hut's flight log should open for you now.",
  ],
  locked: ["ALFRED", "Still encrypted, sir. The dishes re-key it every few seconds."],
  suspicious: ["ALFRED", "One of them is looking your way."],
  alarm1: ["ALFRED", "They've seen you. Break line of sight and let them settle."],
  alarm2: ["ALFRED", "One more alarm and they will purge everything, sir."],
  takedown: ["ALFRED", "Stunned and restrained. He'll wake with a headache."],
  logDone: [
    "ALFRED",
    "Log copied. The override signature belongs to Ines Varga, codename TOLLER. The Batwing is at the water tower.",
  ],
  won: ["BATMAN", "Varga built the override Wayne shelved. Now we know who rang the bell."],
  lostAlarms: ["ALFRED", "They've wiped the servers. We've lost her trail, sir."],
  lostTime: ["ALFRED", "The purge has finished, sir. The log is gone."],
};
