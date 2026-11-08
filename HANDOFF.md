# Handoff

What only the owner of this repository can do, and what is already done for them.

## Needs you

- **Send the portal entry.** The texts are in `submission/portal.md`, counted to the limits, with the logo at
  `submission/doorman-icon-512.png`. Sending it is yours.
- **Run the Discord bot on a real server.** It needs a bot token, a guild id and a role id that only you have:
  `DOORMAN_GATE=<id> DISCORD_TOKEN=... DISCORD_GUILD=... DISCORD_ROLE=... npm run bot` from `bot/`. It is tested
  against a mock Discord here, not against a live server.
- **Record the silent demo** if the portal asks for a video: `submission/demo-script.md`. The site needs a browser
  wallet for the writing steps.
- **Delete `D:\doorman`.** An earlier partial copy of this project; the real one is `D:\doorman2`. The build tool
  blocked the removal, so it was left for you.

## Already done

- Contract deployed on Studio Next; do not redeploy or change `contracts/doorman.py` without deciding to, because
  `contracts/FROZEN.json` and `scripts/verify.py` hold the repository to the deployed bytes.
- Test accounts live in `~/.doorman/accounts.json` on the build machine only.
