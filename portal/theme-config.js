/**
 * Portal Theme Configuration
 * 
 * IP-free theme replacing Batman 1989 references for game portal submission
 */

export const PORTAL_THEME = {
  // Core identity
  game: {
    title: "Shadow Striker: Steel City",
    subtitle: "Night Patrol",
    tagline: "Take back the night.",
    shortName: "Shadow Striker"
  },
  
  // Vehicles/Aircraft
  vehicles: {
    aircraft: "Shadow Striker",
    vehicle: "Nightblade",
    aircraftClass: "Striker-class interceptor"
  },
  
  // Location
  location: {
    city: "Steel City",
    cityFull: "Steel City Metropolitan Area",
    districts: {
      "MIDTOWN": "MIDTOWN",
      "OLD GOTHAM": "OLD QUARTER",
      "THE NARROWS": "THE NARROWS",  // Generic enough
      "TRICORNER DOCKS": "RIVERSIDE DOCKS",
      "GOTHAM RIVER": "CENTRAL RIVER"
    },
    landmarks: {
      "WAYNE TOWER": "VANGUARD TOWER",
      "CATHEDRAL SHELTER": "CATHEDRAL SHELTER",  // Generic
      "TRICORNER SUBSTATION": "RIVERSIDE SUBSTATION"
    }
  },
  
  // Organization
  organization: {
    company: "Vanguard Systems",
    division: "Tactical Division",
    fullName: "Vanguard Systems / Tactical Division"
  },
  
  // Characters
  characters: {
    player: "THE OPERATIVE",
    handler: "HANDLER",
    contact: "CHIEF REEVES",
    villain: "Ines Varga",
    villainCodename: "TOLLER"
  },
  
  // Mission
  mission: {
    operation: "Operation Silent Bell",  // Generic enough to keep
    objective: "heating grid defense",
    threat: "hijacked defense aircraft"
  },
  
  // UI/Branding
  ui: {
    systemName: "Tactical Systems",
    computerName: "Command Terminal",
    navigationSystem: "Navigation",
    secureTransmission: "Secure Transmission"
  },
  
  // Meta
  meta: {
    description: "Free browser action game with flight combat, driving and stealth. Defend Steel City in this unofficial fan game with mobile and controller support.",
    keywords: "flight combat game, browser game, action game, stealth game, driving game"
  }
};

/**
 * Replace Batman IP references with portal theme
 */
export function replaceIPReferences(text) {
  if (!text) return text;
  
  const replacements = {
    // Aircraft
    'Batwing': PORTAL_THEME.vehicles.aircraft,
    'BATWING': PORTAL_THEME.vehicles.aircraft.toUpperCase(),
    'batwing': PORTAL_THEME.vehicles.aircraft.toLowerCase(),
    
    // Vehicle
    'Batmobile': PORTAL_THEME.vehicles.vehicle,
    'BATMOBILE': PORTAL_THEME.vehicles.vehicle.toUpperCase(),
    'batmobile': PORTAL_THEME.vehicles.vehicle.toLowerCase(),
    
    // Base
    'Batcave': 'Headquarters',
    'BATCAVE': 'HEADQUARTERS',
    'batcave': 'headquarters',
    'Batcomputer': PORTAL_THEME.ui.computerName,
    'BATCOMPUTER': PORTAL_THEME.ui.computerName.toUpperCase(),
    
    // City
    'Gotham': PORTAL_THEME.location.city,
    'GOTHAM': PORTAL_THEME.location.city.toUpperCase(),
    'gotham': PORTAL_THEME.location.city.toLowerCase(),
    
    // Organization
    'Wayne Aerospace': PORTAL_THEME.organization.company,
    'Wayne': 'Vanguard',
    'WAYNE': 'VANGUARD',
    
    // Characters
    'Batman': PORTAL_THEME.characters.player,
    'BATMAN': PORTAL_THEME.characters.player,
    'Alfred': PORTAL_THEME.characters.handler,
    'ALFRED': PORTAL_THEME.characters.handler,
    'Gordon': PORTAL_THEME.characters.contact,
    'GORDON': PORTAL_THEME.characters.contact
  };
  
  let result = text;
  for (const [old, replacement] of Object.entries(replacements)) {
    result = result.replace(new RegExp(old, 'g'), replacement);
  }
  
  return result;
}
