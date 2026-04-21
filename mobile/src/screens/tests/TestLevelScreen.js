import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { studentAPI } from '../../services/api';

const LEVEL_INFO = {
  1: { label: 'Starter', emoji: '🌱', color: '#E8F5E9', accent: '#388E3C', description: 'Basic letters, sounds & counting' },
  2: { label: 'Basic', emoji: '📘', color: '#E3F2FD', accent: '#1976D2', description: 'Simple reading & arithmetic' },
  3: { label: 'Intermediate', emoji: '🚀', color: '#FFF3E0', accent: '#F57C00', description: 'Comprehension, fractions & algebra intro' },
  4: { label: 'Advanced', emoji: '⭐', color: '#F3E5F5', accent: '#7B1FA2', description: 'Grammar mastery & problem solving' },
  5: { label: 'Mastery', emoji: '🏆', color: '#FFF8E1', accent: '#F9A825', description: 'Critical thinking & complex maths' },
};

const TestLevelScreen = ({ navigation }) => {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { levels: lvls } = await studentAPI.getLevelStatus();
      setLevels(lvls);
    } catch {
      Alert.alert('Error', 'Could not load test levels.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const startTest = (level) => {
    navigation.navigate('TestQuiz', { level });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Level Tests</Text>
        <Text style={styles.subtitle}>Score 70% to unlock the next level</Text>
      </View>

      {/* Level cards */}
      <View style={styles.levelList}>
        {levels.map((levelData) => {
          const info = LEVEL_INFO[levelData.level];
          const locked = !levelData.unlocked;
          return (
            <TouchableOpacity
              key={levelData.level}
              style={[
                styles.levelCard,
                { backgroundColor: locked ? '#F5F5F5' : info.color,
                  borderColor: locked ? '#E0E0E0' : info.accent,
                  borderWidth: levelData.isCurrent ? 2 : 1,
                },
              ]}
              onPress={() => !locked && startTest(levelData.level)}
              disabled={locked}
              accessibilityRole="button"
              accessibilityLabel={`Level ${levelData.level}: ${info.label}`}
            >
              <View style={styles.levelLeft}>
                <Text style={styles.levelEmoji}>{locked ? '🔒' : info.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelLabel, { color: locked ? '#9E9E9E' : info.accent }]}>
                    Level {levelData.level} — {info.label}
                  </Text>
                  <Text style={[styles.levelDesc, { color: locked ? '#BDBDBD' : '#546E7A' }]}>
                    {info.description}
                  </Text>
                  {levelData.bestScore != null && (
                    <Text style={[styles.bestScore, { color: levelData.everPassed ? '#388E3C' : '#F57C00' }]}>
                      Best: {levelData.bestScore}% {levelData.everPassed ? '✓ Passed' : ''}
                    </Text>
                  )}
                </View>
              </View>
              {!locked && (
                <View style={[styles.startBtn, { backgroundColor: info.accent }]}>
                  <Text style={styles.startBtnText}>
                    {levelData.isCurrent ? 'Start →' : 'Retry →'}
                  </Text>
                </View>
              )}
              {levelData.isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: info.accent }]}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ How tests work</Text>
        <Text style={styles.infoText}>• 20 questions per test{'\n'}• Score 70% or above to pass{'\n'}• Passing unlocks the next level{'\n'}• AI feedback helps you improve after each attempt</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  header: {
    backgroundColor: '#1565C0', paddingTop: 56,
    paddingBottom: 20, paddingHorizontal: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#BBDEFB', marginTop: 2 },
  levelList: { padding: 16, gap: 12 },
  levelCard: {
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 3, overflow: 'hidden',
  },
  levelLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  levelEmoji: { fontSize: 28, marginRight: 12 },
  levelInfo: { flex: 1 },
  levelLabel: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  levelDesc: { fontSize: 12, lineHeight: 17 },
  bestScore: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  startBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  startBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  currentBadge: {
    position: 'absolute', top: 0, right: 0,
    paddingHorizontal: 10, paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  currentBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  infoCard: {
    marginHorizontal: 16, backgroundColor: '#FFF',
    borderRadius: 14, padding: 16, marginTop: 4,
    elevation: 1,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#263238', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#546E7A', lineHeight: 22 },
});

export default TestLevelScreen;
