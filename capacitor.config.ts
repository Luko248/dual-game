import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lukaschylik.dualmind',
  appName: 'DUAL Mind',
  webDir: 'dist',
  /* Lock to portrait — game is designed for portrait phones only. */
  ios: {
    contentInset: 'always',
    /* Splash + status bar live inside the safe area. The game canvas
       already does its own letterboxing via Phaser FIT scale + CSS svi/svb. */
    backgroundColor: '#02020aff'
  },
  android: {
    backgroundColor: '#02020aff'
  }
};

export default config;
