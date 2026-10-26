# Public hosting — The Shady Exhibit v0.4.0

## Status

Prepared for hosting; no public deployment or public URL has been verified.
The full existing game is preserved, including Standard (four players) and Duel
(two players). This is a server game, not the instructor's offline-file option.

## Recommended: one Render Node Web Service

The existing Express process serves `dist/` and Socket.IO together on the
host-provided `PORT`, bound to `0.0.0.0`. The browser uses its own origin for
Socket.IO, so HTTPS automatically uses secure WebSockets. No backend URL,
API key, database, AI account, custom domain, or separate frontend is required.
All game assets and original procedural audio are local. Keep generated asset
names unchanged; build with Vite rather than manually renaming files.

### Accounts

The deployer needs a GitHub account and a Render account. A private repository
is fine if Render is authorized to read it. Visitors need neither account.
No Render/GitHub deployment connection is currently available in this chat.
To delegate publishing, connect an available GitHub integration and authorize
Render's access to the project repository in your Render account; if no Render
integration is available, use its dashboard yourself. Never paste passwords or
API tokens into chat. Creating a paid service requires your explicit approval.

### Exact dashboard steps (no local terminal needed)

1. Extract `shady-hosting-full.zip`. Open the `shady-exhibit` folder.
2. On GitHub choose **New repository**, name it `the-shady-exhibit`, and create
   it. Upload the CONTENTS of `shady-exhibit` to the repository root. Verify
   that `package.json`, `package-lock.json`, `server.ts`, and `render.yaml` are
   at the root beside `src`, `public`, `scripts`, and `docs`. Include all source
   assets. Do not upload `node_modules`, credentials, or test-artifacts.
   Generated `dist` can be included but is rebuilt by Render. If GitHub limits
   one upload batch, commit the root files and folders in separate batches.
3. Sign in at https://dashboard.render.com/ and choose **New > Web Service**.
   Connect GitHub and select this repository. Choose the branch you uploaded.
4. Set the following values:

   | Setting | Value |
   | --- | --- |
   | Runtime | Node |
   | Root Directory | blank (package.json is at repository root) |
   | Build Command | `npm ci --include=dev && npm run build` |
   | Start Command | `npm start` |
   | Instance Type | Free for initial classroom testing |
   | Instances | 1 |
   | Health Check Path | `/health` |
   | Environment: NODE_VERSION | `24` |
   | Environment: NODE_ENV | `production` |
   | Auto-Deploy | Off (avoid interrupting a class match) |

   Do not set PORT; Render supplies it. Do not choose Static Site, add a publish
   directory, or run the Windows launcher on the host. The dev dependencies are
   deliberately installed because the build needs TypeScript/Vite tooling.
5. Click **Create Web Service** and wait for successful build and Live status.
   Alternatively, **New > Blueprint** can use the included `render.yaml` with
   the same settings. Review its Free service before confirming.
6. Copy the actual HTTPS `onrender.com` URL shown by Render. Do not submit a
   localhost address, repository link, dashboard link, or example URL.
7. Open that URL in a signed-out/private browser. Check `/health` returns
   `{"status":"ok"}`. Complete the multiplayer acceptance checks below before
   calling it deployed successfully or submitting it to your instructor.

### Free hosting and reliability

Render Free services sleep after 15 minutes without incoming traffic; the next
visit can take about a minute to wake. Free services can also restart. If your
presentation needs an always-running service, review an appropriate paid
instance in Render yourself; hosting costs belong to the deployer, never a
requirement for players. Check current plan limits before the assignment.

Rooms are stored in server memory. Restart, redeploy, sleep, or crash loses
rooms and disconnects players. Keep exactly ONE server instance/process:
multiple instances or clustered Node workers would split room membership.
This release has no shared-room database/adapter. Do not redeploy during a
match. No claim of production load capacity or denial-of-service hardening is
made. Desktop/laptop browsers with WebGL and keyboard/mouse are the intended
clients; touch controls have not been implemented.

## Instructions to put beside the final playable URL

Open the same link on each player's device. Enter a display name. One player
chooses **Create Room**, copies the room code, and sends it to the others.
The host leaves Standard selected for four players or selects **Two-Player
Duel** before a third player joins. Other players choose **Join Room**, enter
the code, and join. Once exactly four or two players are present, the host
starts. Wait for real loading, read your private role briefing, then everyone
presses Ready. Controls and How to Play are available in the game. The
instructor needs another person for Duel or three other people for Standard;
this is not a solo demonstration and includes no bot substitutes.

## Public acceptance check — still required

1. Test the URL signed out, with no host/developer/AI account, on another device
   and another network. Assets must load with no 404s or mixed-content errors.
2. Browser devtools Network should show `/socket.io/` with a successful
   WebSocket upgrade (101) and continuing bidirectional frames. No localhost
   URLs should appear in browser requests.
3. Complete a two-device Duel: create/join, private roles, readiness/countdown,
   movement, CCTV, both objectives, detention/release, and escape/replay.
4. Complete a four-device Standard match, including capture/rescue, thefts,
   escape, and replay. Check a simultaneous Duel room remains isolated.
5. Test leaving, host transfer, and disconnect cancellation. Reopen after an
   idle period to judge cold-start suitability for the instructor.

Optional non-visual check from a development machine:
`TEST_URL=https://YOUR-ACTUAL-HOST npm run test:hosting`
This creates temporary rooms, starts both modes, then disconnects all six
clients. It checks actual assets and WebSockets. It does NOT prove rendering,
cross-device latency, every gameplay feature, or hosting reliability.

## Local production reproduction

With Node 24 installed: `npm ci --include=dev`, `npm run build`, `npm start`.
Open http://localhost:3000. In a second terminal run `npm run test:hosting`.
The original `PLAY-WINDOWS.cmd` remains included for local development/play.

Official references: https://render.com/docs/deploy-node-express-app
https://render.com/docs/websocket https://render.com/docs/free
https://render.com/docs/blueprint-spec

## Preparation checks actually run

TypeScript check, all 101 automated game checks, and production Vite build
passed. A local production server on a host-provided port served the actual
hashed JS/CSS and both bundled image assets. Six real WebSocket clients
started simultaneous Standard and Duel rooms through loading, private roles,
anonymous readiness and countdown; timers, charges and objective counts were
correct. Disconnecting Duel returned its survivor to the lobby without
interrupting Standard. These are localhost checks, not a public deployment
or a new visual/browser gameplay test. Existing completed gameplay remains
included; no models, layout, asset names or gameplay rules were edited.
