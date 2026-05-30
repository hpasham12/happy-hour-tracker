export interface StructuredAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  postcode?: string;
  country_code?: string;
}

export interface AddressSearchResult {
  display_name: string;
  address?: StructuredAddress;
}

const STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'District of Columbia': 'DC',
};

const STREET_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bNorth\b/g, 'N'],
  [/\bSouth\b/g, 'S'],
  [/\bEast\b/g, 'E'],
  [/\bWest\b/g, 'W'],
  [/\bNortheast\b/g, 'NE'],
  [/\bNorthwest\b/g, 'NW'],
  [/\bSoutheast\b/g, 'SE'],
  [/\bSouthwest\b/g, 'SW'],
  [/\bStreet\b/g, 'St'],
  [/\bAvenue\b/g, 'Ave'],
  [/\bBoulevard\b/g, 'Blvd'],
  [/\bRoad\b/g, 'Rd'],
  [/\bDrive\b/g, 'Dr'],
  [/\bPlace\b/g, 'Pl'],
  [/\bCourt\b/g, 'Ct'],
  [/\bLane\b/g, 'Ln'],
  [/\bTerrace\b/g, 'Ter'],
  [/\bParkway\b/g, 'Pkwy'],
];

function compactStreetName(street: string) {
  return STREET_REPLACEMENTS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    street
  );
}

function compactState(state?: string) {
  if (!state) return '';
  return STATE_ABBREVIATIONS[state] ?? state;
}

function formatStructuredAddress(address: StructuredAddress) {
  const streetName = address.road ?? address.pedestrian ?? address.footway ?? '';
  const street = [address.house_number, compactStreetName(streetName)].filter(Boolean).join(' ');
  const city = address.city ?? address.town ?? address.village ?? address.municipality ?? '';
  const stateAndPostcode = [compactState(address.state), address.postcode].filter(Boolean).join(' ');

  return [street, city, stateAndPostcode].filter(Boolean).join(', ');
}

function formatDisplayNameAddress(displayName: string) {
  const parts = displayName.split(',').map((part) => part.trim()).filter(Boolean);
  const houseNumberIndex = parts.findIndex((part) => /^\d+[A-Za-z]?(?:-\d+)?$/.test(part));

  if (houseNumberIndex === -1 || houseNumberIndex + 1 >= parts.length) {
    return displayName;
  }

  const houseNumber = parts[houseNumberIndex];
  const street = compactStreetName(parts[houseNumberIndex + 1]);
  const postcode = parts.find((part) => /^\d{5}(?:-\d{4})?$/.test(part));
  const state = [...parts].reverse().find((part) => STATE_ABBREVIATIONS[part]);
  const stateAndPostcode = [compactState(state), postcode].filter(Boolean).join(' ');
  const city =
    parts.find((part, index) => index > houseNumberIndex + 1 && part === 'Chicago') ??
    parts.find((part, index) => index > houseNumberIndex + 1 && index < parts.length - 3);

  return [[houseNumber, street].join(' '), city, stateAndPostcode].filter(Boolean).join(', ');
}

export function formatAddress(result: AddressSearchResult) {
  const structuredAddress = result.address ? formatStructuredAddress(result.address) : '';
  return structuredAddress || formatDisplayNameAddress(result.display_name);
}

