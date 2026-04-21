import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { studentAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const SchoolCodeScreen = ({ navigation }) => {
  const { setUser } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const cleaned = code.trim().toUpperCase();
    if (cleaned.length !== 6) {
      Alert.alert('Invalid code', 'School code must be 6 characters');
      return;
    }

    setLoading(true);
    try {
      await studentAPI.joinSchool(cleaned);
      // Refresh profile to get school_id (triggers navigator to go to main tabs)
      const { profile } = await studentAPI.getMyProfile();
      await setUser({ school_id: profile.school_id });
    } catch (err) {
      Alert.alert('Code not found', err?.error || 'Check the code with your teacher and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    // Skip school linking for now — can be done later
    await setUser({ school_id: 'skipped' }); // temporary marker to exit onboarding
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join your school</Text>
      <Text style={styles.subtitle}>
        Ask your teacher for the 6-letter class code to connect your account
      </Text>

      <View style={styles.codeRow}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.codeBox, code[i] ? styles.codeBoxFilled : null]}>
            <Text style={styles.codeChar}>{code[i] || ''}</Text>
          </View>
        ))}
      </View>

      {/* Hidden behind the visual boxes — actual input */}
      <TextInput
        style={styles.hiddenInput}
        value={code}
        onChangeText={(t) => setCode(t.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6))}
        maxLength={6}
        autoCapitalize="characters"
        autoFocus
        accessibilityLabel="School code input"
      />

      <TouchableOpacity
        style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]}
        onPress={handleJoin}
        disabled={loading || code.length !== 6}
        accessibilityRole="button"
      >
        {loading
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.buttonText}>Join Class</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>I don't have a code yet — skip for now</Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Your teacher creates a class and shares a code. This links you to their dashboard so they
          can see your progress and send you exercises.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF', paddingHorizontal: 28, paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '800', color: '#1565C0', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#546E7A', marginBottom: 40, lineHeight: 22 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  codeBox: {
    width: 48, height: 58, borderWidth: 2, borderColor: '#90CAF9',
    borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
  },
  codeBoxFilled: { borderColor: '#1976D2', backgroundColor: '#E3F2FD' },
  codeChar: { fontSize: 22, fontWeight: '800', color: '#1565C0' },
  hiddenInput: { height: 0, width: 0, opacity: 0 },
  button: {
    backgroundColor: '#1976D2', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 32, minHeight: 54,
  },
  buttonDisabled: { backgroundColor: '#90CAF9' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  skipBtn: { marginTop: 20, alignItems: 'center' },
  skipText: { color: '#1976D2', fontSize: 15 },
  infoBox: {
    marginTop: 48, backgroundColor: '#E3F2FD', borderRadius: 12,
    padding: 16, borderLeftWidth: 4, borderLeftColor: '#1976D2',
  },
  infoText: { color: '#37474F', fontSize: 14, lineHeight: 22 },
});

export default SchoolCodeScreen;
