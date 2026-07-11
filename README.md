# Commitment

A clean, local-first commitment planner for building repeatable routines.

## How it works

- Create reusable tasks in an initially empty task bank and assign each a coin reward.
- Drag tasks onto a weekly or biweekly schedule. A task stays in the bank so it can be reused across several days.
- Tick off multiple commitments from the Home screen and earn coins immediately.
- Spend earned coins on rewards in the Shop.
- Review completion rate, completed tasks, claimed rewards, and recent activity.
- Sign in with the existing Firebase account system and optionally activate a Stripe-backed commitment contract.
- Lock a weekly or biweekly schedule when signing; completing every task for the day records a protected day on the account.

The web interface is a self-contained `index.html` with no build step. Local coins and preferences use `localStorage`; authentication, active contracts, completed contract days, and automatic forfeiture billing use the existing Firebase and Stripe backend.

## Run locally

Serve the repository with any small static web server, then open the local URL in a modern browser. Opening `index.html` directly also works, except service-worker features require HTTP or HTTPS.

## Deployment

The repository is ready for GitHub Pages from the default branch. The manifest and app icon use the new Commitment branding.
