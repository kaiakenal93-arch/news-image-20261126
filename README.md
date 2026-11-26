# The World in One Image — Thursday 26 November 2026

[![make.fun](https://img.shields.io/badge/make.fun-bounty-blue)](https://make.fun/bounty/news-image-20261126)
[![Prize $100](https://img.shields.io/badge/prize-%24100-green)](https://make.fun/bounty/news-image-20261126)
[![Entry](https://img.shields.io/badge/entry-news--image--20261126-orange)](https://make.fun/bounty/news-image-20261126)

An entry for the make.fun bounty
[Sum up 26 November's world news in one image](https://make.fun/bounty/news-image-20261126).

## What it is

A single self-contained Node program (`main.ts`, standard library only) that
draws the day's world news as one 1024×1024 PNG: a masthead with the date,
three big hero stories, six more stories, 32 brief items from every region,
and an honesty box that separates what is CLAIMED from what is CONFIRMED.

The three heroes are the stories that broke on 26 November itself:

1. **FCC clears 1 million SpaceX "Starmind" satellites** — the first US
   approval for an orbital AI data-centre constellation.
2. **Cairo tanker fire kills 31** — a fuel tanker overturns on the Ring
   Road; 21 hurt, cause under investigation.
3. **Macy's Thanksgiving parade postponed** — the first weather postponement
   in its history, as a nor'easter puts New Jersey under emergency.

Every casualty and market figure was checked against at least two sources:
Sudan 19 dead (not 6), Nasdaq closed -0.62% and Nvidia -3.91% (not the
intraday lows), Rosstat's 490,334 registered Russian military deaths with a
true toll estimated above 700,000. Claims (Houthi strikes, Iran's Hormuz
mine claims, Ukraine's Savasleyka claim, GPS-jamming blame) are labelled
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

Reuters · BBC · AP · CNN · WSJ · FOX Weather · UEFA · Nature · AFP.
Events first reported 26 Nov 2026 unless dated.
