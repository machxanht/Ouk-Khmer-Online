# Khmer Ouk Chaktrang (អុកចត្រង្គ) — Welcome Portal & Engine

A production-grade Cambodian Khmer Chess (_Ouk Chatrang_ / _Ouk Chaktrang_) application featuring authentic Folk & International tournament rules, multi-tier minimax AI engine, traditional Pinpeat audio synthesis, and rich Khmer Angkor cultural design.

## Features & Visual Identity

- **Cinematic Splash Screen**:
  - Blends the iconic `angkor-hero.jpg` monument with dual-gradient atmospheric shading and Angkor temple grain.
  - Accelerated 8.0s rotating sacred Khmer `LotusMandala` (320px) in Royal Gold.
  - Transparent centerpiece mascot (`mascot.png`) and traditional Khmer typography (**អុកចត្រង្គ** / **OUK CHATRANG**).
  - **Dynamic Theme Inversion**: Day Mode triggers a midnight Obsidian Stone splash; Night Mode triggers a golden Lotus Cream sunrise splash.
  - Replay button available directly in Settings.
- **Authentic Rules & AI Engine**:
  - Folk Rules (King jump, Neang 2-step first move).
  - International Rules (Touch-move, chess clock, tournament scoring).
  - Web Worker minimax AI with alpha-beta pruning.
  - Full _Viel K'dar_ and _Viel L'koun_ honor counting systems.
- **Cultural Design System**:
  - Ada Gold & Obsidian, Ada Red, and Traditional Cambodian SVG piece sets.
  - Traditional Khmer BGM tracks (_Angkor Dawn_, _Royal Khmer_, _Temple Garden_, _Ouk Chaktrang_).
  - Multi-language support: Khmer (`km`), English (`en`), Vietnamese (`vi`), French (`fr`).

## Development

```sh
# Run tests
npx tsx reference_ui/src/lib/khmer-chess.test.ts

# Verify binary assets
python3 scripts/verify_assets.py --strict

# Build client SPA
npm run build
```
