---
name: current-status
description: >-
  Reports only the current status when the user asks for status, dependencies,
  what the module requires, or what is in use. Deletes remnants of old unused
  code. Use when the user asks for status, current status, dependencies, or
  leftover/old/unused remnants.
---

# Current status

when i ask for the status, i only care about the current status

if theres any remnants of old stuff we're not using, delete it

## Status answers

- Answer with what is true right now.
- Do not mention old unused modules, retired settings, historical requirements, or what used to be true.
- Do not list “not required” leftovers unless the user asks what was removed.

## Remnants

- If a setting, export, comment, or file exists only for something no longer used, delete it.
- Keep live fallbacks that current Foundry or dnd5e still calls.
