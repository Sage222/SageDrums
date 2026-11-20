import { DrumPadConfig, DrumPadId } from '../types/drums';

export const YAMAHA_DTX452K_PADS: Record<DrumPadId, DrumPadConfig> = {
  hihat: {
    id: 'hihat',
    name: 'Hi-Hat (Closed)',
    shortLabel: 'HH',
    yamahaModel: '10" Cymbal Pad + HH65 Closed',
    zoneDescription: 'Bow strike with left foot pressing HH65 pedal down',
    keyShortcut: 'Q',
    midiNotes: [42],
    defaultLimb: 'R',
    color: '#0EA5E9',
    strokeColor: '#38BDF8',
  },
  hihat_open: {
    id: 'hihat_open',
    name: 'Hi-Hat (Open)',
    shortLabel: 'HHO',
    yamahaModel: '10" Cymbal Pad + HH65 Released',
    zoneDescription: 'Bow strike with left foot released on HH65 pedal',
    keyShortcut: 'W',
    midiNotes: [46],
    defaultLimb: 'R',
    color: '#0284C7',
    strokeColor: '#7DD3FC',
  },
  hihat_pedal: {
    id: 'hihat_pedal',
    name: 'HH65 Foot Chick',
    shortLabel: 'HHP',
    yamahaModel: 'HH65 Hi-Hat Controller Pedal',
    zoneDescription: 'Depress left foot pedal briskly for foot chick / splash',
    keyShortcut: 'Z',
    midiNotes: [44],
    defaultLimb: 'LF',
    color: '#0369A1',
    strokeColor: '#38BDF8',
  },
  crash: {
    id: 'crash',
    name: 'Crash Cymbal',
    shortLabel: 'CR',
    yamahaModel: '10" Cymbal Pad (Choke Enabled)',
    zoneDescription: 'Edge/bow accent strike; pinch edge to choke',
    keyShortcut: 'E',
    midiNotes: [49, 55, 57],
    defaultLimb: 'R',
    color: '#F59E0B',
    strokeColor: '#FBBF24',
  },
  ride: {
    id: 'ride',
    name: 'Ride Cymbal',
    shortLabel: 'RD',
    yamahaModel: '10" Ride Cymbal Pad',
    zoneDescription: 'Defined bow ping or bell accent on upper right rack',
    keyShortcut: 'R',
    midiNotes: [51, 53, 59],
    defaultLimb: 'R',
    color: '#EAB308',
    strokeColor: '#FDE047',
  },
  snare: {
    id: 'snare',
    name: 'Snare (Head Zone 1)',
    shortLabel: 'SN',
    yamahaModel: 'TP70S 7.5" 3-Zone Snare Pad',
    zoneDescription: 'Center rubber head strike for crisp snare tone',
    keyShortcut: 'S',
    midiNotes: [38],
    defaultLimb: 'L',
    color: '#F97316',
    strokeColor: '#FB923C',
  },
  snare_rim: {
    id: 'snare_rim',
    name: 'Snare Open Rimshot (Zone 2)',
    shortLabel: 'RIM',
    yamahaModel: 'TP70S Zone 2 Rim',
    zoneDescription: 'Strike center head and front rim simultaneously',
    keyShortcut: 'D',
    midiNotes: [40],
    defaultLimb: 'L',
    color: '#EA580C',
    strokeColor: '#FDBA74',
  },
  snare_cross: {
    id: 'snare_cross',
    name: 'Snare Cross-Stick (Zone 3)',
    shortLabel: 'XSTK',
    yamahaModel: 'TP70S Zone 3 Rear Rim',
    zoneDescription: 'Rest palm on head and click stick shaft on outer rim sector',
    keyShortcut: 'F',
    midiNotes: [37],
    defaultLimb: 'L',
    color: '#D97706',
    strokeColor: '#FCD34D',
  },
  tom1: {
    id: 'tom1',
    name: 'Tom 1 (High)',
    shortLabel: 'T1',
    yamahaModel: '7.5" Rack Tom Pad (Left)',
    zoneDescription: 'Upper-left rack tom mounted above snare',
    keyShortcut: 'U',
    midiNotes: [48, 50],
    defaultLimb: 'L',
    color: '#10B981',
    strokeColor: '#34D399',
  },
  tom2: {
    id: 'tom2',
    name: 'Tom 2 (Mid)',
    shortLabel: 'T2',
    yamahaModel: '7.5" Rack Tom Pad (Right)',
    zoneDescription: 'Upper-right rack tom mounted beside Tom 1',
    keyShortcut: 'I',
    midiNotes: [45, 47],
    defaultLimb: 'R',
    color: '#059669',
    strokeColor: '#6EE7B7',
  },
  tom3: {
    id: 'tom3',
    name: 'Tom 3 (Floor)',
    shortLabel: 'T3',
    yamahaModel: '7.5" Floor Tom Pad (Lower Right)',
    zoneDescription: 'Right wing rack arm positioned at snare height',
    keyShortcut: 'O',
    midiNotes: [41, 43],
    defaultLimb: 'R',
    color: '#047857',
    strokeColor: '#34D399',
  },
  kick: {
    id: 'kick',
    name: 'KP65 Kick Tower',
    shortLabel: 'BD',
    yamahaModel: 'KP65 Kick Pad + FP6110A Belt Pedal',
    zoneDescription: 'Right foot beater strike on KP65 rubber kick tower',
    keyShortcut: 'Space',
    midiNotes: [35, 36],
    defaultLimb: 'RF',
    color: '#EC4899',
    strokeColor: '#F472B6',
  },
};

export const PAD_ORDER_FOR_GRID: DrumPadId[] = [
  'crash',
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
