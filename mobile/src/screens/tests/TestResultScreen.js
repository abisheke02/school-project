import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated,
} from 'react-native';
import Tts from 'react-native-tts';

const LEVEL_LABELS = { 1: 'Starter', 2: 'Basic', 3: 'Intermediate', 4: 'Advanced', 5: 'Mastery' };
const PASS_THRESHOLD = 70;

const TestResultScreen = ({ navigation, route }) => {
  const { result, level } = route.params;
  const { scorePercent, correctCount, totalQuestions, passed, leveledUp, aiFeedback, scoredAnswers } = result;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Speak result
    const msg = passed
      ? leveledUp
        ? `Congratulations! You passed Level ${level} with ${scorePercent} percent! You have unlocked Level ${level + 1}!`
        : `Well done! You passed with ${scorePercent} percent!`
      : `You scored ${scorePercent} percent. You need ${PASS_THRESHOLD} percent to pass. Keep practising and try again!`;
    Tts.speak(msg, { language: 'en-IN', rate: 0.85 });
  }, []);

  const scoreColor = scorePercent >= PASS_THRESHOLD ? '#388E3C' : '#D32F2F';
  const bgColor = scorePercent >= PASS_THRESHOLD ? '#E8F5E9' : '#FFEBEE';

  return (
    <ScrollView style={styles.container}>
      {/* Result hero */}
      <View style={[styles.hero, { backgroundColor: bgColor }]}>
        <Animated.View style={[styles.heroInner, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.resultEmoji}>
            {leveledUp ? '🏆' : passed ? '🎉' : '💪'}
          </Text>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{scorePercent}%</Text>
          <Text style={[styles.resultLabel, { color: scoreColor }]}>
            {passed ? 'PASSED!' : 'NOT YET'}
          </Text>
          <Text style={styles.levelLabel}>
            Level {level} — {LEVEL_LABELS[level]}
          </Text>
        </Animated.View>

        {/* Level up banner */}
        {leveledUp && (
          <Animated.View style={[styles.levelUpBanner, { opacity: fadeAnim }]}>
            <Text style={styles.levelUpText}>
              🔓 Level {level + 1} ({LEVEL_LABELS[level + 1]}) Unlocked!
            </Text>
          </Animated.View>
        )}
      </View>

      {/* Stats */}
      <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{correctCount}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={[styles.statBox, styles.statMiddle]}>
          <Text style={styles.statNum}>{totalQuestions - correctCount}</Text>
          <Text style={styles.statLabel}>Missed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{totalQuestions}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${scorePercent}%`, backgroundColor: scoreColor }]} />
          {/* Pass threshold marker */}
          <View style={[styles.thresholdMarker, { left: `${PASS_THRESHOLD}%` }]} />
        </View>
        <Text style={styles.barLabel}>Pass mark: {PASS_THRESHOLD}%</Text>
      </View>

      {/* AI Feedback */}
      {aiFeedback && (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>🤖 AI Feedback</Text>
          <Text style={styles.feedbackText}>{aiFeedback}</Text>
          <TouchableOpacity
            onPress={() => Tts.speak(aiFeedback, { language: 'en-IN', rate: 0.85 })}
            style={styles.listenBtn}
          >
            <Text style={styles.listenBtnText}>🔊 Listen</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Answer review (top 5 wrong) */}
      {scoredAnswers?.filter((a) => !a.isCorrect).length > 0 && (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Review missed questions</Text>
          {scoredAnswers
            .filter((a) => !a.isCorrect)
            .slice(0, 5)
            .map((a, i) => (
              <View key={i} style={styles.reviewItem}>
                <Text style={styles.reviewQ}>{a.questionId}</Text>
                <Text style={styles.reviewWrong}>Your answer: {a.studentAnswer || '(no answer)'}</Text>
                <Text style={styles.reviewCorrect}>Correct: {a.correctAnswer}</Text>
                {a.explanation && (
                  <Text style={styles.reviewExplanation}>💡 {a.explanation}</Text>
                )}
              </View>
            ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {!passed && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.replace('TestQuiz', { level })}
          >
            <Text style={styles.retryBtnText}>Try Again →</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
        {passed && !leveledUp && (
          <TouchableOpacity
            style={styles.practiceBtn}
            onPress={() => navigation.navigate('Practice')}
          >
            <Text style={styles.practiceBtnText}>Keep Practising</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  hero: {
    paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, alignItems: 'center',
  },
  heroInner: { alignItems: 'center' },
  resultEmoji: { fontSize: 72, marginBottom: 8 },
  scoreText: { fontSize: 64, fontWeight: '900', lineHeight: 72 },
  resultLabel: { fontSize: 20, fontWeight: '800', letterSpacing: 2, marginTop: 4 },
  levelLabel: { fontSize: 14, color: '#546E7A', marginTop: 8 },
  levelUpBanner: {
    marginTop: 16, backgroundColor: '#FFF3E0', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1.5, borderColor: '#FF9800',
  },
  levelUpText: { color: '#E65100', fontWeight: '800', fontSize: 15, textAlign: 'center' },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden',
    elevation: 2,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E3F2FD' },
  statNum: { fontSize: 24, fontWeight: '900', color: '#263238' },
  statLabel: { fontSize: 11, color: '#78909C', marginTop: 2 },

  barContainer: { marginHorizontal: 16, marginTop: 16 },
  barTrack: {
    height: 16, backgroundColor: '#E3F2FD', borderRadius: 8,
    overflow: 'visible', position: 'relative',
  },
  barFill: { height: '100%', borderRadius: 8 },
  thresholdMarker: {
    position: 'absolute', top: -4, width: 3, height: 24,
    backgroundColor: '#FF5252', borderRadius: 2,
  },
  barLabel: { fontSize: 11, color: '#90A4AE', marginTop: 6, textAlign: 'right' },

  feedbackCard: {
    margin: 16, backgroundColor: '#FFF', borderRadius: 14, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#1976D2', elevation: 2,
  },
  feedbackTitle: { fontSize: 15, fontWeight: '800', color: '#1565C0', marginBottom: 10 },
  feedbackText: { fontSize: 14, color: '#37474F', lineHeight: 22 },
  listenBtn: {
    marginTop: 10, alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  listenBtnText: { color: '#1976D2', fontSize: 13, fontWeight: '600' },

  reviewCard: {
    margin: 16, marginTop: 0, backgroundColor: '#FFF',
    borderRadius: 14, padding: 16, elevation: 1,
  },
  reviewTitle: { fontSize: 15, fontWeight: '700', color: '#263238', marginBottom: 12 },
  reviewItem: {
    paddingBottom: 12, marginBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  reviewQ: { fontSize: 12, color: '#90A4AE', marginBottom: 4 },
  reviewWrong: { fontSize: 13, color: '#D32F2F', marginBottom: 2 },
  reviewCorrect: { fontSize: 13, color: '#388E3C', fontWeight: '600', marginBottom: 4 },
  reviewExplanation: { fontSize: 12, color: '#546E7A', fontStyle: 'italic' },

  actions: { paddingHorizontal: 16, gap: 10, marginTop: 4 },
  retryBtn: {
    backgroundColor: '#1976D2', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  retryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  homeBtn: {
    backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#90CAF9',
  },
  homeBtnText: { color: '#1976D2', fontSize: 15, fontWeight: '600' },
  practiceBtn: {
    backgroundColor: '#E8F5E9', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  practiceBtnText: { color: '#388E3C', fontSize: 15, fontWeight: '600' },
});

export default TestResultScreen;
