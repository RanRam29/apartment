import { Alert, Platform } from 'react-native';

export function showAlert(
  title: string,
  message: string,
  buttons?: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }>,
  options?: { cancelable?: boolean }
) {
  if (Platform.OS === 'web') {
    const action = buttons?.find(b => b.style !== 'cancel');
    if (!buttons || !action) {
      window.alert(`${title}\n\n${message}`);
      buttons?.[0]?.onPress?.();
      return;
    }
    if (window.confirm(`${title}\n\n${message}`)) {
      action.onPress?.();
    } else {
      const cancelAction = buttons?.find(b => b.style === 'cancel');
      cancelAction?.onPress?.();
    }
    return;
  }
  Alert.alert(title, message, buttons as any, options);
}
