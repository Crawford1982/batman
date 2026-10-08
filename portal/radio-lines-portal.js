// Portal version of radio-lines.js with IP-free text

// Text-only tactical cue; no recording is claimed or requested for this line.
export const GROUND_CONTACT =
  "CHIEF REEVES / They've found you. Keep moving—drones are lining up an attack.";

export const RADIO_LINES = {
  "handler-theatre": [
    "HANDLER",
    "The theatre district is deserted, sir, but those rooftops are not.",
  ],
  "handler-railway": ["HANDLER", "The elevated railway will give you cover, keep moving."],
  "handler-emp": ["HANDLER", "Their tracking signal has dropped, nicely done."],
  "handler-relay-down": ["HANDLER", "That relay is offline, their grip on the city is weakening."],
  "reeves-north": ["CHIEF REEVES", "Head north into the Old Quarter, we are keeping the shelter doors open."],
  "reeves-approach": ["CHIEF REEVES", "We can hear your engine, bring the override to the front steps."],
  "reeves-hold": ["CHIEF REEVES", "The families are holding on, just get here in one piece."],
  "reeves-last-wave": [
    "CHIEF REEVES",
    "This is their last attack, hold the corridor and we can get everyone out.",
  ],

  "handler-patrol": ["HANDLER", "The city is quiet, take a moment to get your bearings."],
  "handler-relays": ["HANDLER", "Attack source identified, disable the three red command relays."],
  "handler-drive": ["HANDLER", "Take the override to the cathedral and follow the gold route."],
  "handler-left": ["HANDLER", "Turn left at the junction, the corridor is clear."],
  "reeves-inbound": ["CHIEF REEVES", "Bomber inbound, intercept it before it reaches the shelter."],
  "reeves-hit": ["CHIEF REEVES", "The shelter has been hit, we cannot take much more of this."],
  "reeves-final": ["CHIEF REEVES", "Relays are down, stop the last three bombers while we evacuate."],
  "reeves-safe": ["CHIEF REEVES", "The override is accepted, heat is restored and our people are safe."],
  "striker-air": ["THE OPERATIVE", "I'm on it, keep those people moving."],
  "nightblade-drive": ["THE OPERATIVE", "Hold on, Chief, I'm bringing the override."],
};

// Chapter III, part two (Kessler rooftops). Text-only captions; no recordings
// exist or are claimed for these lines, so they stay out of RADIO_LINES.
export const ROOFTOP_LINES = {
  briefing: [
    "HANDLER",
    "Kessler Cold Storage. Three uplink dishes on these roofs still re-key the hijack carrier.",
  ],
  plan: ["THE OPERATIVE", "Dishes first. Then the flight log tells us who flew those aircraft."],
  start: [
    "HANDLER",
    "Grapple across the gaps. Stay out of their sight lines; vents and plant rooms give cover.",
  ],
  uplink: ["HANDLER", "That dish has gone dark."],
  uplinksDone: [
    "HANDLER",
    "The carrier is silent. The control hut's flight log should open now.",
  ],
  locked: ["HANDLER", "Still encrypted. The dishes re-key it every few seconds."],
  suspicious: ["HANDLER", "One of them is looking your way."],
  alarm1: [
    "HANDLER",
    "They've seen you, and TOLLER has sped up the purge. Break line of sight and let them settle.",
  ],
  alarm2: [
    "HANDLER",
    "The purge is accelerating. One more alarm and they will wipe everything.",
  ],
  heard: ["HANDLER", "He heard your footsteps. Walk when they're close."],
  jammed: ["HANDLER", "Not with a guard on alert up there. He'd see it go dark. Lose him first."],
  takedown: ["HANDLER", "Stunned and restrained. He'll wake with a headache."],
  body: ["HANDLER", "They've found the man you stunned. Keep out of sight while they search."],
  logDone: [
    "HANDLER",
    "Log copied. The override signature belongs to Ines Varga, codename TOLLER. Extraction point is at the water tower.",
  ],
  won: ["THE OPERATIVE", "Varga built the override that was shelved. Now we know who rang the bell."],
  lostAlarms: ["HANDLER", "They've wiped the servers. We've lost her trail."],
  lostTime: ["HANDLER", "The purge has finished. The log is gone."],
};
