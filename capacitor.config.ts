import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.entrenapp.app',
  appName: 'entrenApp',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: true,
    },
    StatusBar: {
      style: 'DARK',
    },
  },
};

export default config;
