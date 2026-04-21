import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import Tts from 'react-native-tts';

const LD_INFO = {
  dyslexia: {
    label: 'Dyslexia',
    emoji: '📖',
    color: '#7B1FA2',
    bgColor: '#F3E5F5',
    description: 'You find it easier to learn with sounds and pictures. Many brilliant people have dyslexia — including scientists and artists!',
    strengths: ['Great at creative thinking', 'Strong problem solving', 'Excellent verbal memory'],
  },
  dysgraphia: {
    label: 'Dysgraphia',
    emoji: '✍️',
    color: '#E64A19',
    bgColor: '#FBE9E7',
    description: 'Writing by hand can feel tricky for you. Using voice-to-text and typing can really help!',
    strengths: ['Strong verbal skills', 'Creative ideas', 'Good at speaking'],
  },
  dyscalculia: {
    label: 'Dyscalculia',
    emoji: '🔢',
    color: '#1976D2',
    bgColor: '#E3F2FD',
    description: 'Numbers and maths can feel confusing sometimes. With the right tools and practice, you can do it!',
    strengths: ['Strong in arts and language', 'Creative thinking', 'Great memory for words'],
  },
  mixed: {
    label: 'Mixed Learning Differences',
    emoji: '🌟',
    color: '#F57F17',
    bgColor: '#FFF8E1',
    description: 'You learn differently in multiple areas. That makes you unique! With the right support, you can excel.',
    strengths: ['Highly creative', 'Unique perspective', 'Strong intuition'],
  },
  not_detected: {
    label: 'No Learning Differences Detected',
    emoji: '🎉',
    color: '#2E7D32',
    bgColor: '#E8F5E9',
    description: 'Your screening did not show signs of a learning disability. Keep up the great work!',
    strengths: ['Great learning skills', 'Good focus', 'Strong academic foundation'],
  },
};

const RiskMeter = ({ score, color }) => (
  <View style={styles.meterContainer}>
    <View style={styles.meterBg}>
      <View style={[styles.meterFill, { width: `${score}%`, backgroundColor: color }]} />
    </View>
    <Text style={[styles.meterScore, { color }]}>{score}/100</Text>
  </View>
);

const ScreeningResultScreen = ({ route, navigation }) => {
  const { result } = route.params;
  const info = LD_INFO[result.ldType] || LD_INFO.not_detected;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    // Read result to student
    const msg = `Your learning profile is ready. ${info.label}. ${info.description}`;
    Tts.setDefaultRate(0.85);
    setTimeout(() => Tts.speak(msg), 800);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Result header */}
        <View style={[styles.resultCard, { backgroundColor: info.bgColor, borderColor: info.color }]}>
          <Text style={styles.resultEmoji}>{info.emoji}</Text>
          <Text style={styles.resultLabel}>Your Learning Profile</Text>
          <Text style={[styles.ldTypeText, { color: info.color }]}>{info.label}</Text>
          <Text style={styles.descText}>{info.description}</Text>
        </View>

        {/* Risk scores */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Risk Scores</Text>
          {Object.entries(result.riskScores || {}).map(([type, score]) => (
            <View key={type} style={styles.riskRow}>
              <Text style={styles.riskLabel}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              <RiskMeter score={score} color={score > 70 ? '#EF4444' : score > 40 ? '#F59E0B' : '#22C55E'} />
            </View>
          ))}
        </View>

        {/* Strengths */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Strengths 💪</Text>
          {info.strengths.map((s, i) => (
            <View key={i} style={styles.strengthRow}>
              <Text style={styles.strengthBullet}>✦</Text>
              <Text style={styles.strengthText}>{s}</Text>
            </View>
          ))}
        </View>

        {/* What happens next */}
        <View style={[styles.card, styles.nextCard]}>
          <Text style={styles.cardTitle}>What happens next?</Text>
          <Text style={styles.nextText}>
            ✅ Your teacher will be able to see your learning profile and will get strategies to help you.
          </Text>
          <Text style={styles.nextText}>
            📚 We will give you exercises made just for how you learn.
          </Text>
          <Text style={styles.nextText}>
            🔄 We will check again in 90 days to see how much you've grown!
          </Text>
        </View>

        {/* AI reasoning (teacher context, shown simplified) */}
        {result.reasoning ? (
          <View style={styles.reasoningCard}>
            <Text style={styles.reasoningTitle}>Our analysis:</Text>
            <Text style={styles.reasoningText}>{result.reasoning}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace('Main')}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Go to My Dashboard →</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  content: { paddingHorizontal: 18, paddingTop: 52, paddingBottom: 40 },

  resultCard: {
    borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16,
    borderWidth: 2,
  },
  resultEmoji: { fontSize: 52, marginBottom: 8 },
  resultLabel: { fontSize: 14, color: '#78909C', fontWeight: '600', marginBottom: 6 },
  ldTypeText: { fontSize: 26, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  descText: { fontSize: 15, color: '#546E7A', textAlign: 'center', lineHeight: 23 },

  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 18,
    marginBottom: 14, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#263238', marginBottom: 14 },

  riskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  riskLabel: { width: 100, fontSize: 14, color: '#546E7A', fontWeight: '600' },
  meterContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  meterBg: { flex: 1, height: 10, backgroundColor: '#ECEFF1', borderRadius: 5, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 5 },
  meterScore: { fontSize: 13, fontWeight: '700', width: 50, textAlign: 'right' },

  strengthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  strengthBullet: { fontSize: 14, color: '#1976D2', marginTop: 2 },
  strengthText: { fontSize: 14, color: '#37474F', lineHeight: 21, flex: 1 },

  nextCard: { borderTopWidth: 3, borderTopColor: '#1976D2' },
  nextText: { fontSize: 14, color: '#37474F', lineHeight: 23, marginBottom: 8 },

  reasoningCard: {
    backgroundColor: '#ECEFF1', borderRadius: 14, padding: 16, marginBottom: 20,
  },
  reasoningTitle: { fontSize: 13, fontWeight: '700', color: '#546E7A', marginBottom: 6 },
  reasoningText: { fontSize: 13, color: '#607D8B', lineHeight: 20 },

  button: {
    backgroundColor: '#1976D2', borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', marginTop: 8, minHeight: 56,
  },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
});

export default ScreeningResultScreen;
