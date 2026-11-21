import { DrumPadConfig, DrumPadId } from '../types/drums';

export const YAMAHA_DTX452K_PADS: Record<DrumPadId, DrumPadConfig> = {
  hihat: {
    id: 'hihat',
    kitNumber: 1,
    name: 'Hi-Hat (Closed)',
    friendlyName: 'Hi-Hat',
    shortLabel: 'HH',
    zoneDescription: 'Bow strike with left foot pressing Hi-Hat pedal down',
    keyShortcut: 'Q',
    midiNotes: [42],
    defaultLimb: 'R',
    color: '#0EA5E9',
    strokeColor: '#38BDF8',
  },
  snare: {
    id: 'snare',
    kitNumber: 2,
    name: 'Snare (Head Zone 1)',
    friendlyName: 'Snare',
    shortLabel: 'SN',
    zoneDescription: 'Center head strike for crisp snare tone',
    keyShortcut: 'S',
    midiNotes: [38],
    defaultLimb: 'L',
    color: '#F97316',
    strokeColor: '#FB923C',
  },
  kick: {
    id: 'kick',
    kitNumber: 3,
    name: 'Kick Drum',
    friendlyName: 'Kick',
    shortLabel: 'BD',
    zoneDescription: 'Right foot beater strike on kick pad',
    keyShortcut: 'Space',
    midiNotes: [35, 36],
    defaultLimb: 'RF',
    color: '#EC4899',
    strokeColor: '#F472B6',
  },
  crash: {
    id: 'crash',
    kitNumber: 4,
    name: 'Crash Cymbal',
    friendlyName: 'Crash',
    shortLabel: 'CR',
    zoneDescription: 'Edge/bow accent strike; pinch edge to choke',
    keyShortcut: 'E',
    midiNotes: [49, 55, 57],
    defaultLimb: 'R',
    color: '#8B5CF6',
    strokeColor: '#A78BFA',
  },
  tom1: {
    id: 'tom1',
    kitNumber: 5,
    name: 'Tom 1 (High)',
    friendlyName: 'Tom 1',
    shortLabel: 'T1',
    zoneDescription: 'Upper-left rack tom mounted above snare',
    keyShortcut: 'U',
    midiNotes: [48, 50],
    defaultLimb: 'L',
    color: '#10B981',
    strokeColor: '#34D399',
  },
  tom2: {
    id: 'tom2',
    kitNumber: 6,
    name: 'Tom 2 (Mid)',
    friendlyName: 'Tom 2',
    shortLabel: 'T2',
    zoneDescription: 'Upper-right rack tom mounted beside Tom 1',
    keyShortcut: 'I',
    midiNotes: [45, 47],
    defaultLimb: 'R',
    color: '#059669',
    strokeColor: '#6EE7B7',
  },
  tom3: {
    id: 'tom3',
    kitNumber: 7,
    name: 'Tom 3 (Floor)',
    friendlyName: 'Tom 3',
    shortLabel: 'T3',
    zoneDescription: 'Right wing rack arm positioned at snare height',
    keyShortcut: 'O',
    midiNotes: [41, 43],
    defaultLimb: 'R',
    color: '#047857',
    strokeColor: '#34D399',
  },
  ride: {
    id: 'ride',
    kitNumber: 8,
    name: 'Ride (Bow)',
    friendlyName: 'Ride Bow',
    shortLabel: 'RD',
    zoneDescription: 'Warm rhythmic bow strike on outer ride surface',
    keyShortcut: 'R',
    midiNotes: [51, 59],
    defaultLimb: 'R',
    color: '#9333EA',
    strokeColor: '#C084FC',
  },
  hihat_open: {
    id: 'hihat_open',
    kitNumber: 9,
    name: 'Hi-Hat (Open)',
    friendlyName: 'Open Hi-Hat',
    shortLabel: 'HHO',
    zoneDescription: 'Bow strike with left foot released on Hi-Hat pedal',
    keyShortcut: 'W',
    midiNotes: [46],
    defaultLimb: 'R',
    color: '#0284C7',
    strokeColor: '#7DD3FC',
  },
  ride_bell: {
    id: 'ride_bell',
    kitNumber: 10,
    name: 'Ride (Bell)',
    friendlyName: 'Ride Bell',
    shortLabel: 'RBL',
    zoneDescription: 'Bright, cutting metallic ping on center bell dome',
    keyShortcut: 'T',
    midiNotes: [53],
    defaultLimb: 'R',
    color: '#7C3AED',
    strokeColor: '#DDD6FE',
  },
  hihat_pedal: {
    id: 'hihat_pedal',
    kitNumber: 11,
    name: 'Hi-Hat Foot Chick',
    friendlyName: 'HH Pedal',
    shortLabel: 'HHP',
    zoneDescription: 'Depress left foot pedal briskly for foot chick',
    keyShortcut: 'Z',
    midiNotes: [44],
    defaultLimb: 'LF',
    color: '#0369A1',
    strokeColor: '#38BDF8',
  },
  snare_rim: {
    id: 'snare_rim',
    kitNumber: 12,
    name: 'Snare Open Rimshot (Zone 2)',
    friendlyName: 'Rimshot',
    shortLabel: 'RIM',
    zoneDescription: 'Strike center head and front rim simultaneously',
    keyShortcut: 'D',
    midiNotes: [40],
    defaultLimb: 'L',
    color: '#EA580C',
    strokeColor: '#FDBA74',
  },
  snare_cross: {
    id: 'snare_cross',
    kitNumber: 13,
    name: 'Snare Cross-Stick (Zone 3)',
    friendlyName: 'Cross-Stick',
    shortLabel: 'XSTK',
    zoneDescription: 'Rest palm on head and click stick shaft on outer rim sector',
    keyShortcut: 'F',
    midiNotes: [37],
    defaultLimb: 'L',
    color: '#A855F7',
    strokeColor: '#D8B4FE',
  },
};

export const PAD_ORDER_FOR_GRID: DrumPadId[] = [
  'crash',
  'ride_bell',
  'ride',
  'hihat_open',
  'hihat',
  'tom1',
  'tom2',
  'tom3',
  'snare_rim',
  'snare_cross',
  'snare',
  'kick',
  'hihat_pedal',
];

export function getStepCountLabel(stepIndex: number, stepsPerBar: number, timeSignature: string): string {
  if (stepsPerBar === 8 && timeSignature === '4/4') {
    const labels = ['1', '&', '2', '&', '3', '&', '4', '&'];
    return labels[stepIndex % 8];
  }
  if (stepsPerBar === 16 && timeSignature === '4/4') {
    const labels = ['1', 'e', '&', 'a', '2', 'e', '&', 'a', '3', 'e', '&', 'a', '4', 'e', '&', 'a'];
    return labels[stepIndex % 16];
  }
  if (stepsPerBar === 12 && (timeSignature === '12/8' || timeSignature === '4/4')) {
    const labels = ['1', 'la', 'li', '2', 'la', 'li', '3', 'la', 'li', '4', 'la', 'li'];
    return labels[stepIndex % 12];
  }
  if (stepsPerBar === 6 && timeSignature === '6/8') {
    const labels = ['1', '2', '3', '4', '5', '6'];
    return labels[stepIndex % 6];
  }
  if (stepsPerBar === 12 && timeSignature === '6/8') {
    const labels = ['1', '&', '2', '&', '3', '&', '4', '&', '5', '&', '6', '&'];
    return labels[stepIndex % 12];
  }
  if (stepsPerBar === 10 && timeSignature === '5/4') {
    const labels = ['1', '&', '2', '&', '3', '&', '4', '&', '5', '&'];
    return labels[stepIndex % 10];
  }
  if (stepsPerBar === 7 && timeSignature === '7/8') {
    const labels = ['1', '2', '3', '4', '5', '6', '7'];
    return labels[stepIndex % 7];
  }
  if (stepsPerBar === 14 && timeSignature === '7/8') {
    const labels = ['1', '&', '2', '&', '3', '&', '4', '&', '5', '&', '6', '&', '7', '&'];
    return labels[stepIndex % 14];
  }
  return String(stepIndex + 1);
}
