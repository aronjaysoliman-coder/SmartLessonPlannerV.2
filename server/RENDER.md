# Render deployment

For an existing Render service, use these settings (do not create a duplicate):

- Service type: Web Service, runtime: Node
- Root Directory: `server`
- Build Command: `npm ci`
- Start Command: `npm start`
- Health Check Path: `/health`
- Environment: `NODE_ENV=production`, `NODE_VERSION=22`
- Secret environment variable: `MONGODB_URI` from Atlas Connect > Drivers
- Optional AI environment: `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `NVIDIA_BASE_URL`

For a new service, the repository-root `render.yaml` provides these settings.
Its free plan is for initial testing; it sleeps when idle. Choose a paid
instance in Render for a continuously running backend. No paid plan is
automatically enabled by this configuration.

In Atlas Network Access, allow the outbound IP ranges listed by your Render
service. Adding your laptop's IP does not allow Render to connect. Confirm
the database is running and the database user can access the application DB.
Keep all database credentials in Render, never in Expo public variables.

Deploy the updated commit and verify the logs show the database connected.
Open `https://YOUR-SERVICE.onrender.com/health` and verify `{"ok":true}`.

Set `EXPO_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com` in the app's root
`.env`, replacing the local LAN address. Restart Expo with `npx expo start --clear`.
For installed builds, set the same variable in the build environment and
rebuild/update the app; changing the server's environment does not update
an already bundled mobile app.

Render hosts the API, not the Expo Go development session. Independent iOS
and Android use requires distributed mobile builds (such as TestFlight/App
Store and Android APK/Play Store), or a separately deployed web app. Expo Go
with a local Metro server still depends on that development server.
