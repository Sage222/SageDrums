# SageDrums — Interactive Yamaha DTX452K Drum Learning Studio

**SageDrums** is an interactive HTML5/React step-by-step drum learning studio purpose-built for the **Yamaha DTX452K** layout across **Desktop** and **Android** devices (both portrait and landscape orientations).

---

## Key Features

- **30-Lesson Progressive Curriculum (20 Bars Each)**: Follow 30 structured lessons in sequence from absolute beginner fundamentals to advanced polyrhythms and linear gospel chops.
- **1-Bar Audible & Visual Count-In**: Optional 1-bar tempo count-in before Bar 1 begins (`BEAT 1 / 4` → `BEAT 4 / 4` in `4/4`, or `BEAT 1 / 6` → `BEAT 6 / 6` in `6/8`) so your sticks are already in time on the downbeat.
- **Loop Forever Mode (`∞`)**: Toggle continuous bar looping during practice to drill any groove or fill endlessly without stopping at Bar 20.
- **Full-Screen Stage Mode**: Distraction-free full-screen view designed for mounting an Android phone, tablet, or laptop on a music stand next to your drum module.
- **Real-Time Microphone Feedback & Wave Tracker**: Live Web Audio API oscilloscope waveform visualization and transient onset detection that grades every note (`PERFECT`, `GOOD`, `EARLY`, `LATE`, `MISSED`) in milliseconds.
- **Interactive Multi-Zone Drum Kit Diagram**:
  - **3-Zone Snare**: Center Head (`[S]`), Open Rimshot (`[D]`), and Closed Rim / Cross-Stick (`[F]`).
  - **Dual-Sound Ride Cymbal**: Separate interactive **Ride Bow** (`[R]`) and bright metallic **Ride Bell** (`[T]`) zones.
  - **Crash Cymbal**: Full-bodied multi-layer metallic shimmer decay (`[E]`) with edge choke indicator.
  - **Hi-Hat & Foot Pedal**: Closed Hi-Hat (`[Q]`), Open Hi-Hat (`[W]`), and Left-Foot Hi-Hat Chick Pedal (`[Z]`).
  - **Toms & Kick Drum**: High Tom 1 (`[U]`), Mid Tom 2 (`[I]`), Floor Tom 3 (`[O]`), and Kick Tower (`[Space]`).
- **USB-MIDI, Microphone, Touch & Keyboard Input**: Connect your module via USB-MIDI, use your device microphone for acoustic/pad transient tracking, tap pads on touchscreen devices, or trigger zones via keyboard shortcuts.
- **Virtual Studio Metronome**: Precision Web Audio lookahead scheduler (40–240 BPM) with Tap Tempo, Time Signatures (`4/4`, `3/4`, `6/8`, `5/4`, `7/8`), Subdivisions (Quarter, 8th, 16th, Triplet), and Auto Speed Trainer.
- **Retained Scoring & Progress Tracking Dashboard**: Every completed 20-bar session is scored (`0–100%`) and saved locally so you can track session-over-session accuracy improvement, best streaks, and tier mastery.

---

## Kit Zones, Keyboard Shortcuts & MIDI Mappings

| Kit Zone | Short Label | Keyboard Key | General MIDI Note | Description |
| :--- | :---: | :---: | :---: | :--- |
| **Hi-Hat Closed** | `HH` | `Q` | `42` (F#1) | Crisp closed hi-hat bow stroke |
| **Hi-Hat Open** | `HHO` | `W` | `46` (A#1) | Sustaining open hi-hat wash |
| **Hi-Hat Pedal Chick** | `HHP` | `Z` | `44` (G#1) | Left-foot pedal chick |
| **Crash Cymbal** | `CR` | `E` | `49` (C#2) | Long 2.75s multi-layer metallic crash |
| **Ride Bow** | `RD` | `R` | `51` (D#2) | Warm shimmering ride bow stroke |
| **Ride Bell** | `RDB` | `T` | `53` (F2) | Clear, cutting high-harmonic bell ping |
| **Snare Head (Zone 1)** | `SN` | `S` | `38` (D1) | Primary center snare pad |
| **Snare Rimshot (Zone 2)** | `SNR` | `D` | `40` (E1) | High-attack open rimshot |
| **Cross-Stick (Zone 3)** | `XSTK` | `F` | `37` (C#1) | Woody closed side-stick click |
| **Tom 1 (High)** | `T1` | `U` | `48` (C2) | High rack tom |
| **Tom 2 (Mid)** | `T2` | `I` | `45` (A1) | Mid rack tom |
| **Tom 3 (Floor)** | `T3` | `O` | `43` (G1) | Low floor tom |
| **Kick Drum** | `BD` | `Space` | `36` (C1) | Right-foot bass drum pedal |

---

## 30-Lesson Curriculum Overview

1. **Tier 1 — Foundation (Lessons 1–6)**: Quarter-note pulse, snare backbeat, first 8th-note rock groove, four-on-the-floor, crash accents, and simple tom endings.
2. **Tier 2 — Groove Essentials (Lessons 7–12)**: 16th-note kick variations, open hi-hat bark, left-foot hi-hat chick independence, cross-stick ballads, ride bow & bell patterns, and full-kit rock fills.
3. **Tier 3 — Dynamic Control (Lessons 13–18)**: Ghost-note snare control, open rimshot backbeats, single-stroke 16th fills, double-stroke roll application, single paradiddle grooves, and 12/8 slow blues shuffle.
4. **Tier 4 — Genre Mastery (Lessons 19–24)**: Syncopated funk pocket, Texas shuffle & Rosanna half-time feel, Bossa Nova cross-stick & bass ostinato, Jazz ride spang-a-lang with 2 & 4 hi-hat chick, Reggae one-drop, and Punk double-time drive.
5. **Tier 5 — Advanced Artist (Lessons 25–30)**: Linear funk groove, 6/8 Afro-Cuban Bembe bell & tom flow, 5/4 Take Five odd-meter swing, 7/8 progressive rock groove, 32nd-note gospel chop crossovers, and the Master Final Showcase.

---

## Microphone Wave Tracker & Calibration

1. Click **Mic OFF / ON** in the top header (or inside the Live Wave & Rhythm Accuracy Tracker) to enable real-time audio analysis.
2. Adjust **Sensitivity** so your stick hits cross the dashed threshold line cleanly without triggering on background room noise.
3. Adjust **Latency Offset (`0–120 ms`)** if using Bluetooth speakers or specific Android audio drivers so visual beat evaluation aligns with your physical strike.
4. Watch the live timing pill (`PERFECT ≤38ms`, `GOOD ≤78ms`, `EARLY`, `LATE`) to tighten your pocket.
