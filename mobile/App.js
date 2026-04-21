import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetInfo from '@react-native-community/netinfo';
import AppNavigator from './src/navigation/index';
import useAuthStore from './src/store/authStore';
import { initOfflineDB, syncPendingSessions } from './src/services/offlineCache';

const App = () => {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
    initOfflineDB().catch(console.warn);
    syncPendingSessions().catch(console.warn);

    // Auto-sync when internet returns
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('[App] Internet restored, triggering sync...');
        syncPendingSessions().catch(console.warn);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
};

export default App;
