import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e06ca5ffcee7497891f517099811735c',
  appName: 'Paddle Leaderboard',
  webDir: 'dist',
  server: {
    url: 'https://e06ca5ff-cee7-4978-91f5-17099811735c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
