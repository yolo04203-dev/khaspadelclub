# Khas Padel Club (React Native)

## Project info

This repository now targets a React Native build using Expo. Native screens for
each route live under `native/screens`, and the UI is implemented with React
Native components.

## How can I edit this code?

If you want to work locally using your own IDE, you can clone this repo and
push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server.
npm run start
```

## What technologies are used for this project?

This project is built with:

- Expo
- React Native
- React Navigation
- TypeScript

## How can I deploy this project?

Use Expo Application Services (EAS) or the Expo CLI to build and distribute
your app.

## Notes

- The original web app remains under `src/` for historical reference, but the
  app entry and navigation now point to the React Native screens.
