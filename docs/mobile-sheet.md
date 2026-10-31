# Mobile sheet

The sheet already works. You tap a row, it does the thing.

Closed and open are the two modes. Flip is just open / close.

## Closed — controller

You are holding the token, not reading the character.

Already there: walk pad, flip, walk mode, leftover feet.

Add the rest of the table’s token toys:

- Aura
- Light
- Enter combat, then the same combat button the bar uses (waiting / your turn / end turn)

No icon well here. Attacks live on the sheet.

## Open — sheet

Look, prepare, bag, tap to use. Leave it.

## Use that needs targets

Phone has no map (`core.noCanvas`). You cannot tap tokens on the canvas the way the table picker does.

So:

1. Sheet is open. You tap Fireball (or anything that needs people).
2. Sheet closes.
3. List of tokens in range. Tap one to mark it — Foundry targeting, so everyone sees the mark.
4. Confirm. It fires the same Midi path the table uses.
5. Sheet opens again.

Cancel goes back to the sheet and does not fire.

Table already has this job as `startTargetPick` / `setTarget` / confirm in `action-bar-target-picker.mjs`. Phone uses a range list instead of canvas taps.

## Leave alone

No live map, chat, journals, or a second Foundry combat tracker on the phone.
