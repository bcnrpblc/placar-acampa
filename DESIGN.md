# Design System — Placar Acampa

## Product Context
- **What this is:** Live event scoreboard. Admins enter points; a public page shows team standings on a TV (telão).
- **Who it's for:** A crowd viewing a big screen from across a room; admins on laptops/phones.
- **Space/industry:** Camp / class challenges / tournaments, pt-BR.
- **Project type:** Public TV display + internal admin tool.
- **Memorable thing:** Who is winning, readable from across the room.

## Aesthetic Direction
- **Direction:** Industrial / broadcast scoreboard. Flat, calm, authoritative.
- **Decoration level:** minimal. No glows, no ornaments; type and color do the work.
- **Mood:** A sports-broadcast graphic: numbers first, everything else quiet.
- **Research:** TVs are read from ~3 m: very large high-contrast numerals, generous spacing, a safe zone away from the edges, only essential info.

## Typography
- **Display / scores / team names / event title:** Barlow Condensed 800, uppercase for names and title. Tabular figures for scores so counting up does not jitter.
- **Labels / pills:** Barlow 500-600.
- **Loading:** Google Fonts link in `index.html`.
- **Scale (TV page):** event title 8vmin (11vmin with no subtitle), subtitle 3.2vmin, pills 1.6vmin. Inside cards everything is in `cqmin` of the card: score 26-30, team name 8, rank 8, label 4.

## Color
- **Approach:** restrained. Theme-driven per event, stored in `events.theme` as `{ background, text, accent }`.
- **Theme tokens (CSS vars on the scoreboard root):** `--sb-bg`, `--sb-text`, `--sb-accent`.
- **Default preset "Carvão":** bg `#0B0D10`, text `#F4F6F8`, accent `#22D3EE`. Other presets: Noite (`#0A1020` / `#F1F5FF` / `#FBBF24`), Claro (`#F5F5F0` / `#111418` / `#0E7490`).
- **Roles:** accent = event title, divider, pill borders, live dot. Text = names, labels. Panels are `--sb-text` mixed 6% into `--sb-bg`; hairlines 16%.
- **Team color:** the only other color: top band, avatar ring/fallback, score number. Text on a team color uses black or white, whichever has more contrast (`readableOn`).
- **Guard:** the admin picker warns when background/text contrast is below 4.5:1.

## Spacing
- **Base unit:** viewport-relative on the TV page. Safe-zone padding 4vmin; gaps 2.5vmin.
- **Density:** comfortable.

## Layout
- **Approach:** grid-disciplined. Header band, hairline in accent, team grid filling the rest of the screen without scrolling.
- **Columns by team count:** 2→2, 3→3, 4→2x2, 5→3+2 (centered), 6→3x2, 7-8→4 per row, 9→3x3, 10→5x2.
- **Leader:** marked by structure, never by light: thicker team band (3.5 vs 1.8cqmin), larger numeral, "LÍDER" tag. Only shown when the leader has more than 0 points.
- **Border radius:** 2cqmin cards, 1cqmin tags. Nothing may paint outside its card (no outer box-shadow).

## Motion
- **Approach:** minimal-functional + moments.
- **Always:** score count-up on change, AO VIVO dot pulse.
- **Moments:** 1.2 s color flash inside a card when it receives points; "NOVO LÍDER" tag for 6 s when the lead changes hands.
- **Never:** continuous glow or pulsing cards.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-10-14 | Initial design system for the TV scoreboard | /design-consultation: glow around the leader bled into neighbouring cards and header was not separated from scores |
| 2026-10-14 | Colors come from a per-event theme chosen by the admin at creation | User wants each event to have its own look; keeps score structure separate from presentation |
| 2026-10-14 | Motion: "broadcast + moments" | User choice; calm baseline with feedback only when points arrive or the lead changes |
