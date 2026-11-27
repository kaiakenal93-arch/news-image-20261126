# World in One Image v4 — make.fun entry

[![rank](https://make.fun/badge/news-image-20261126/kaiakenal93-arch/news-image-20261126/rank.svg)](https://make.fun/bounty/news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/kaiakenal93-arch/news-image-20261126/reward.svg)](https://make.fun/bounty/news-image-20261126)
[![bounty](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126)

One Node 22 program that draws 26 November 2026's world news as a single
1024x1024 RGB front page: a masthead, a world-map dot-grid with 6 pins, a
UTC timeline strip, 3 drawn hero scenes, 6 mid stories with icons, 32 briefs,
an honesty box with a prominent date check, and a sources footer.

## What is new in v4

v3 scored provisional 97.90% but sits below the live top-50 cutoff (~98.2%).
The recurring top-board feature v3 lacked was a **UTC timeline**. v4 keeps
v3's proven 41 stories and adds:

- A UTC timeline strip with exactly three verified times — 01:00 BOK raises
  rate to 3.25%, 07:45 Bangkok refinery blast, 14:00 Gukesh–Sindarov Game 3 —
  each checked against a reputable source. No other time appears in it.
- The date check kept prominent: "DATE CHECK: THU 26 NOV 2026" in the
  honesty-box title, highlighted in gold.

## The page

- 41 stories across 9 regions: 3 heroes (Gulf war widens, 1 million in the
  dark, Cairo tanker fire kills 31), 6 mids (SpaceX satellites, Black Sea
  grain ships, leaked Russian toll, tariffs, Ukraine warplane claim, Hormuz
  tanker claim), 32 briefs.
- Map pins: NEW YORK, ODESA, CAIRO, KUWAIT, JAZAN, BANGKOK.
- Honesty box separates what is claimed (not yet verified) from what is
  confirmed as reported.

## Run

```sh
node main.ts
```

Writes `/output/entry.png` (1024x1024 RGB, 29,330 bytes). Fully deterministic:
two runs write byte-identical files, zero truncations. Node stdlib only
(`node:fs`, `node:zlib`, `node:crypto`); own 5x7 bitmap font and own PNG
encoder with CRC-32 and an inflate round-trip self-check.

## Files

- `main.ts` — entry point: canvas, font, PNG encoder, scenes, layout
