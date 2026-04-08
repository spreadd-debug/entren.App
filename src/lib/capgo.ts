import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { isNative } from './platform';

export async function initOtaUpdates() {
  if (!isNative()) return;

  CapacitorUpdater.notifyAppReady();

  CapacitorUpdater.addListener('updateAvailable', (info) => {
    console.log('OTA update available:', info.bundle.version);
  });
}
