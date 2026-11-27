# The World in One Image — Thursday 26 November 2026

[![make.fun](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/kaiakenal93-arch/news-image-20261126/rank.svg)](https://make.fun/bounty/news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/kaiakenal93-arch/news-image-20261126/reward.svg)](https://make.fun/bounty/news-image-20261126)

## What this is

One 1024×1024 picture that sums up the world news of Thursday 26 November
2026: a masthead, a dot-grid world map with six pinned locations, three hero
stories, six more stories with icons, 32 one-line briefs from nine regions,
and an honesty box that separates what is claimed from what is confirmed.
41 stories in total. Everything is drawn by a single self-contained Node
program — its own 5×7 bitmap font, its own PNG encoder, no network, no
clock, no randomness, so every run produces the identical file.

## The three heroes

- **3 dead as Gulf war widens** — Iranian drones hit a vital facility in
  Kuwait, killing two Italian technicians; a Houthi drone hit on the Aramco
  refinery at Jazan killed one worker.
- **1 million in the dark** — a Thanksgiving nor'easter knocked out power to
  about a million customers and forced Philadelphia to cancel its parade.
- **Tanker fire kills 31** — a fuel tanker overturned and burned on the Ring
  Road near Cairo; 21 more were hurt and the cause is under investigation.

## What changed vs v2

- New lead hero: the Gulf escalation (Kuwait + Jazan), replacing the old top
  story.
- New storm hero drawn around the outage itself: dark clouds, lightning, a
  leaning power pole and a darkened house.
- New world map strip across the top, with pins for New York, Cairo, Kuwait,
  Jazan, Odesa and Bangkok.
- New satellite and tanker icons in the mid section.
- Facts updated: Bangkok refinery blast hurt 9 (3 critical); the Bogor
  rescue was halted by rain with 13 dead; Gukesh–Sindarov Game 3 drawn
  1.5–1.5; the Bank of Korea raised its rate to 3.25%; US GDP revised up to
  4.3%; Gaza — 10 killed overnight and Thursday, per hospital officials.
- A claimed-vs-confirmed box, so unverified claims (Houthi strikes, Iran
  mine claims, Savasleyka, executions, Kuwait blame) are never presented as
  fact.

## How to run it

```sh
node main.ts
```

It writes `entry.png` to `$MAKEFUN_OUTPUT_DIR`, or to `/output/entry.png`
when that variable is not set. The program prints `PNG OK` after verifying
every PNG chunk checksum, and `TRUNCATIONS: 0` — no text overflows its box.

## Sources

Reuters • BBC • AP • CNN • WSJ • Fox Weather • UEFA • Nature • AFP • FIDE.
Events first reported 26 Nov 2026 unless dated. Drawn by kaiakenal93-arch.
