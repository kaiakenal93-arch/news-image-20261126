# The World in One Image — Thursday 26 November 2026

[![make.fun · news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/kaiakenal93-arch/news-image-20261126/rank.svg)](https://make.fun/bounty/news-image-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/kaiakenal93-arch/news-image-20261126/reward.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)

An entry for the make.fun bounty
[Sum up 26 November's world news in one image](https://make.fun/bounty/news-image-20261126).

**v2.** The submitted v1 scored 96.42% provisional (10W-1D-1L); this version
keeps the same structure and adds the evening's biggest stories, corrects
the Bogor mine toll, drops one stale story, and redraws the hero scenes so
each one reads at a glance.

## What it is

A single self-contained Node program (`main.ts`, standard library only) that
draws the day's world news as one 1024×1024 PNG: a masthead with the date,
three big hero stories, six more stories, 32 brief items from nine regions,
and an honesty box that separates what is CLAIMED from what is CONFIRMED —
with a date check in its title.

The three heroes are the stories that broke on 26 November itself:

1. **FCC clears 1 million SpaceX "Starmind" satellites** — the first US
   approval for an orbital AI data-centre constellation.
2. **Cairo tanker fire kills 31** — a fuel tanker overturns on the Ring
   Road; 21 hurt, cause under investigation.
3. **Macy's Thanksgiving parade postponed** — the first weather postponement
   in its history, as a nor'easter puts New Jersey under emergency.

New in v2: Russia hits two grain ships off Odesa (100,000 tons of grain);
a Bangkok refinery blast hurts 7; the Bogor mine toll is now 13 dead and
13 trapped; the Dow closes above 50,000 for the first time; Gukesh–Sindarov
play Game 3 of the World Chess Championship tonight, tied 1–1; India marks
18 years since 26/11. The North Sea GPS-jamming brief from v1 is gone —
that incident was 9 November, not today.

Every casualty and market figure was checked against at least two sources:
Sudan 19 dead (not 6), Bogor 13 dead and 13 trapped (not 9 and 17),
Bangkok 7 hurt, Nasdaq closed -0.62% and Nvidia -3.91% (not the intraday
lows), Rosstat's 490,334 registered Russian military deaths with a true
toll estimated above 700,000. Claims (Houthi strikes, Iran's Hormuz mine
claims, Ukraine's Savasleyka claim, Russia's ship-cargo claim) are labelled
claims, never shown as fact.

## How it works

`main.ts` draws everything from scratch with its own 5×7 bitmap font and
flat vector scenes — no images, no network, no date or random input. The
PNG encoder (zlib + CRC-32) is in the same file, and the program walks its
own PNG chunks after encoding to verify every checksum. Two runs write
byte-identical output.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/entry.png — 1024x1024, under 1 MiB, deterministic
```

## Sources

Reuters · BBC · AP · CNN · WSJ · FOX Weather · UEFA · Nature · AFP · FIDE.
Events first reported 26 Nov 2026 unless dated.
