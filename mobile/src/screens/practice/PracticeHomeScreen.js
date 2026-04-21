import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { studentAPI } from '../../services/api';

const EXERCISE_TYPES = [
  {
    key: 'phonics',
    label: 'Phonics',
    emoji: '🔤',
    color: '#E3F2FD',
    accent: '#1976D2',
    description: 'Letter sounds & word blending',
  },
  {
    key: 'reading',
    label: 'Reading',
    emoji: '📖',
    color: '#E8F5E9',
    accent: '#388E3C',
    description: 'Sentences & short stories',
  },
  {
    key: 'writing',
    label: 'Writing',
    emoji: '✏️',
    color: '#FFF3E0',
    accent: '#F57C00',
    description: 'Spelling & dictation',
  },
  {
    key: 'math',
    label: 'Math',
    emoji: '🔢',
    color: '#F3E5F5',
    accent: '#7B1FA2',
    description: 'Numbers & word problems',
  },
];

const PracticeHomeScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [{ profile: p }, { history: h }] = await Promise.all([
        studentAPI.getMyProfile(),
        studentAPI.getPracticeHistory(),
      ]);
      setProfile(p);
      setHistory(h || []);
    } catch {
      Alert.alert('Error', 'Could not load practice data.');
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const startExercise = (type) => {
    navigation.navigate('ExerciseSession', { exerciseType: type });
  };

  const recentCount = history.length;
  const avgScore = history.length
    ? Math.round(history.reduce((s, h) => s + (h.total_score || 0), 0) / history.length)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Practice</Text>
        <Text style={styles.subtitle}>Level {profile?.current_level ?? 1} exercises</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{recentCount}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={[styles.statBox, styles.statMiddle]}>
          <Text style={[styles.statNum, { color: '#E65100' }]}>🔥 {profile?.streak_count ?? 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{avgScore}%</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
      </View>

      {/* Exercise type cards */}
      <Text style={styles.sectionTitle}>Choose an exercise</Text>
      <View style={styles.grid}>
        {EXERCISE_TYPES.map((ex) => (
          <TouchableOpacity
            key={ex.key}
            style={[styles.exerciseCard, { backgroundColor: ex.color, borderColor: ex.accent }]}
            onPress={() => startExercise(ex.key)}
            accessibilityRole="button"
            accessibilityLabel={`Start ${ex.label} exercise`}
          >
            <Text style={styles.exerciseEmoji}>{ex.emoji}</Text>
            <Text style={[styles.exerciseLabel, { color: ex.accent }]}>{ex.label}</Text>
            <Text style={styles.exerciseDesc}>{ex.description}</Text>
            <View style={[styles.startBtn, { backgroundColor: ex.accent }]}>
              <Text style={styles.startBtnText}>Start →</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent sessions */}
      {history.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent sessions</Text>
          {history.slice(0, 5).map((session) => (
            <View key={session.id} style={styles.sessionRow}>
              <View>
                <Text style={styles.sessionType}>{session.session_type}</Text>
                <Text style={styles.sessionDate}>
                  {new Date(session.completed_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short',
                  })}
                </Text>
              </View>
              <Text style={[
                styles.sessionScore,
                { color: session.total_score >= 80 ? '#388E3C' : session.total_score >= 50 ? '#F57C00' : '#D32F2F' }
              ]}>
                {session.total_score != null ? `${Math.round(session.total_score)}%` : '—'}
              </Text>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: {
    backgroundColor: '#1565C0', paddingTop: 56,
    paddingBottom: 20, paddingHorizontal: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#BBDEFB', marginTop: 2 },

  statsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E3F2FD' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#1565C0' },
  statLabel: { fontSize: 11, color: '#78909C', marginTop: 2 },

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: '#263238',
    marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginHorizontal: 12, gap: 10,
  },
  exerciseCard: {
    width: '47%', borderRadius: 14, padding: 16,
    borderWidth: 1.5, elevation: 1,
  },
  exerciseEmoji: { fontSize: 28, marginBottom: 6 },
  exerciseLabel: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  exerciseDesc: { fontSize: 12, color: '#546E7A', marginBottom: 12, lineHeight: 17 },
  startBtn: { borderRadius: 8, paddingVertical: 6, alignItems: 'center' },
  startBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  sessionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 6,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    elevation: 1,
  },
  sessionType: { fontSize: 14, fontWeight: '600', color: '#263238', textTransform: 'capitalize' },
  sessionDate: { fontSize: 12, color: '#90A4AE', marginTop: 2 },
  sessionScore: { fontSize: 18, fontWeight: '800' },
});

export default PracticeHomeScreen;
