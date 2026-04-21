import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';

const STEPS = [
  { icon: '👁️', text: 'Look at letters and words' },
  { icon: '👂', text: 'Listen to sounds (use headphones if you have them)' },
  { icon: '🔢', text: 'Answer some number questions' },
  { icon: '⏱️', text: 'Takes about 10 minutes' },
];

const ScreeningIntroScreen = ({ navigation }) => (
  <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.emoji}>🧠</Text>
    <Text style={styles.title}>Let's learn how you learn!</Text>
    <Text style={styles.subtitle}>
      We'll ask you some fun questions. There are no wrong answers — we just want to understand
      how your brain works best so we can help you.
    </Text>

    <View style={styles.stepsCard}>
      <Text style={styles.stepsTitle}>In this quiz you will:</Text>
      {STEPS.map((step, i) => (
        <View key={i} style={styles.stepRow}>
          <Text style={styles.stepIcon}>{step.icon}</Text>
          <Text style={styles.stepText}>{step.text}</Text>
        </View>
      ))}
    </View>

    <View style={styles.tipsCard}>
      <Text style={styles.tipsTitle}>Tips for best results:</Text>
      <Text style={styles.tipText}>• Sit in a quiet place</Text>
      <Text style={styles.tipText}>• Take your time — don't rush</Text>
      <Text style={styles.tipText}>• If you don't know, guess your best answer</Text>
    </View>

    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate('ScreeningQuiz')}
      accessibilityRole="button"
      accessibilityLabel="Start the screening quiz"
    >
      <Text style={styles.buttonText}>I'm Ready — Start Quiz →</Text>
    </TouchableOpacity>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  content: { paddingHorizontal: 24, paddingTop: 52, paddingBottom: 40, alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#1565C0', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#546E7A', textAlign: 'center', lineHeight: 23, marginBottom: 28 },
  stepsCard: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 18,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#1976D2',
  },
  stepsTitle: { fontSize: 15, fontWeight: '700', color: '#263238', marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  stepIcon: { fontSize: 20 },
  stepText: { fontSize: 14, color: '#546E7A', flex: 1, lineHeight: 20 },
  tipsCard: {
    width: '100%', backgroundColor: '#FFF3E0', borderRadius: 16, padding: 16,
    marginBottom: 32, borderLeftWidth: 4, borderLeftColor: '#FF6F00',
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#E65100', marginBottom: 8 },
  tipText: { fontSize: 13, color: '#BF360C', lineHeight: 22 },
  button: {
    width: '100%', backgroundColor: '#1976D2', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', minHeight: 56,
  },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
});

export default ScreeningIntroScreen;
