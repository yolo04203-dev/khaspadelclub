import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.khaspadel.app',
  appName: 'Khas Padel Club',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#0d1a2d',
    loggingBehavior: 'none'
  },
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0d1a2d'
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0d1a2d',
      showSpinner: false
    }
  }
};

export default config;
