import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { studentAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const CLASS_GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
];

const ProfileSetupScreen = ({ navigation }) => {
  const { setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [classGrade, setClassGrade] = useState('');
  const [languagePref, setLanguagePref] = useState('en');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Name required', 'Please enter at least 2 characters');
      return;
    }
    const ageNum = parseInt(age);
    if (!age || ageNum < 5 || ageNum > 18) {
      Alert.alert('Age required', 'Enter your age between 5 and 18');
      return;
    }
    if (!classGrade) {
      Alert.alert('Class required', 'Please select your class');
      return;
    }

    setLoading(true);
    try {
      const { profile } = await studentAPI.setupProfile({
        name: name.trim(),
        age: ageNum,
        classGrade: parseInt(classGrade),
        languagePref,
      });
      await setUser({ name: profile.name, language_pref: profile.language_pref });
      navigation.navigate('SchoolCode');
    } catch (err) {
      Alert.alert('Error', err?.error || 'Could not save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tell us about yourself</Text>
      <Text style={styles.subtitle}>This helps us personalise your learning experience</Text>

      <Text style={styles.label}>Your name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Arjun Kumar"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        accessibilityLabel="Name input"
      />

      <Text style={styles.label}>Your age</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 10"
        keyboardType="numeric"
        maxLength={2}
        value={age}
        onChangeText={(t) => setAge(t.replace(/\D/g, ''))}
        accessibilityLabel="Age input"
      />

      <Text style={styles.label}>Your class</Text>
      <View style={styles.gridRow}>
        {CLASS_GRADES.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.chip, classGrade === g && styles.chipSelected]}
            onPress={() => setClassGrade(g)}
            accessibilityRole="button"
            accessibilityLabel={`Class ${g}`}
          >
            <Text style={[styles.chipText, classGrade === g && styles.chipTextSelected]}>
              Class {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Preferred language</Text>
      <View style={styles.gridRow}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.chip, languagePref === lang.code && styles.chipSelected]}
            onPress={() => setLanguagePref(lang.code)}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, languagePref === lang.code && styles.chipTextSelected]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.buttonText}>Next →</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#1565C0', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#546E7A', marginBottom: 36, lineHeight: 22 },
  label: { fontSize: 15, fontWeight: '600', color: '#263238', marginBottom: 10, marginTop: 20 },
  input: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#90CAF9', borderRadius: 10,
    paddingHorizontal: 16, fontSize: 16, color: '#263238', minHeight: 52,
  },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#90CAF9', backgroundColor: '#FFF', minHeight: 44,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  chipText: { fontSize: 14, color: '#546E7A' },
  chipTextSelected: { color: '#FFF', fontWeight: '700' },
  button: {
    backgroundColor: '#1976D2', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 40, minHeight: 54,
  },
  buttonDisabled: { backgroundColor: '#90CAF9' },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});

export default ProfileSetupScreen;
