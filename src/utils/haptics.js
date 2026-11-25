import { Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

export async function hapticLight() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (_) {
    try {
      Vibration.vibrate(12);
    } catch (__) {}
  }
}

export async function hapticMedium() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (_) {
    try {
      Vibration.vibrate(25);
    } catch (__) {}
  }
}

export async function hapticSelection() {
  try {
    await Haptics.selectionAsync();
  } catch (_) {
    try {
      Vibration.vibrate(10);
    } catch (__) {}
  }
}

export async function hapticSuccess() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (_) {
    try {
      Vibration.vibrate([0, 65, 45, 110]);
    } catch (__) {}
  }
}

export async function hapticError() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (_) {
    try {
      Vibration.vibrate([0, 100, 50, 100]);
    } catch (__) {}
  }
}