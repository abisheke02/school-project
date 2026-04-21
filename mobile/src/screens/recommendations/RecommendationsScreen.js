import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Alert,
  ActivityIndicator,
} from 'react-native';
import Tts from 'react-native-tts';
import { studentAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const BADGE_DATA = [
  { id: 'first_session', label: 'First Step', emoji: '🌱', condition: (stats) => stats.totalSessions >= 1 },
  { id: 'streak_3', label: '3-Day Streak', emoji: '🔥', condition: (stats) => stats.streak >= 3 },
  { id: 'streak_7', label: 'Week Warrior', emoji: '⚡', condition: (stats) => stats.streak >= 7 },
  { id: 'streak_30', label: 'Month Master', emoji: '🏅', condition: (stats) => stats.streak >= 30 },
  { id: 'level_2', label: 'Level 2 Reached', emoji: '📘', condition: (stats) => stats.level >= 2 },
  { id: 'level_3', label: 'Level 3 Reached', emoji: '🚀', condition: (stats) => stats.level >= 3 },
  { id: 'level_5', label: 'Mastery!', emoji: '🏆', condition: (stats) => stats.level >= 5 },
  { id: 'screened', label: 'Self-Aware Learner', emoji: '🧠', condition: (stats) => stats.screened },
];

const RecommendationsScreen = ({ navigation }) => {
  const { user } = useAuthStore();
  const [recs, setRecs] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [recData, { profile: p }] = await Promise.all([
        studentAPI.getMyRecommendations(),
        studentAPI.getMyProfile(),
      ]);
      setRecs(recData);
      setProfile(p);
    } catch {
      Alert.alert('Error', 'Could not load recommendations.');
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

  const speakRec = (text) => {
    Tts.speak(text, { language: 'en-IN', rate: 0.85 });
  };

  const studentStats = {
    totalSessions: 0, // would come from history
    streak: profile?.streak_count || 0,
    level: profile?.current_level || 1,
    screened: !!profile?.ld_type,
  };

  const earnedBadges = BADGE_DATA.filter((b) => b.condition(studentStats));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Getting your tips…</Text>
      </View>
    );
  }

  // Parse recommendations
  const recommendations = recs?.recommendations || {};
  const exercises = recommendations.exercises || recommendations.strategies || [];
  const tipsList = recommendations.tips || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Tips & Badges</Text>
        <Text style={styles.subtitle}>Personalised by AI based on your progress</Text>
      </View>

      {/* Badges / Gamification */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏅 Your Badges</Text>
        {earnedBadges.length === 0 ? (
          <View style={styles.noBadgesCard}>
            <Text style={styles.noBadgesText}>Start practising to earn your first badge! 🌱</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeRow}>
            {earnedBadges.map((badge) => (
              <View key={badge.id} style={styles.badgeCard}>
                <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                <Text style={styles.badgeLabel}>{badge.label}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Locked badges preview */}
        <Text style={styles.lockedLabel}>Next to unlock:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {BADGE_DATA.filter((b) => !b.condition(studentStats)).slice(0, 4).map((badge) => (
            <View key={badge.id} style={styles.badgeLocked}>
              <Text style={styles.badgeLockedEmoji}>🔒</Text>
              <Text style={styles.badgeLockedLabel}>{badge.label}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Level progress strip */}
      <View style={styles.progressStrip}>
        {[1, 2, 3, 4, 5].map((lvl) => (
          <View key={lvl} style={styles.levelDot}>
            <View style={[
              styles.levelDotCircle,
              lvl <= (profile?.current_level || 1)
                ? styles.levelDotActive
                : styles.levelDotLocked,
            ]}>
              <Text style={styles.levelDotText}>{lvl}</Text>
            </View>
            <Text style={styles.levelDotLabel}>
              {['Starter','Basic','Inter','Adv','Master'][lvl - 1]}
            </Text>
          </View>
        ))}
      </View>

      {/* Streak card */}
      <View style={styles.streakCard}>
        <View style={styles.streakLeft}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <View>
            <Text style={styles.streakNum}>{profile?.streak_count ?? 0} day streak</Text>
            <Text style={styles.streakSub}>Keep practising every day!</Text>
          </View>
        </View>
        {(profile?.streak_count || 0) >= 3 && (
          <Text style={styles.streakBadge}>🏅 Active</Text>
        )}
      </View>

      {/* AI Exercise Recommendations */}
      {exercises.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Recommended This Week</Text>
          {exercises.map((ex, i) => (
            <View key={i} style={styles.recCard}>
              <View style={styles.recHeader}>
                <Text style={styles.recTitle}>{ex.title || ex.name || `Exercise ${i + 1}`}</Text>
                {ex.ld_target && (
                  <Text style={styles.recTag}>{ex.ld_target}</Text>
                )}
              </View>
              <Text style={styles.recDesc}>{ex.description || ex.reason}</Text>
              <View style={styles.recActions}>
                <TouchableOpacity
                  style={styles.recBtn}
                  onPress={() => navigation.navigate('ExerciseSession', { exerciseType: ex.type || 'phonics' })}
                >
                  <Text style={styles.recBtnText}>Start →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => speakRec(ex.description || ex.reason)}
                  style={styles.speakBtn}
                >
                  <Text style={styles.speakBtnText}>🔊</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Parent/student tips */}
      {tipsList.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Tips for You</Text>
          {tipsList.map((tip, i) => (
            <View key={i} style={styles.tipCard}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDesc}>{tip.description}</Text>
              {tip.duration && (
                <Text style={styles.tipDuration}>⏱ {tip.duration}</Text>
              )}
              <TouchableOpacity onPress={() => speakRec(`${tip.title}. ${tip.description}`)}>
                <Text style={styles.speakBtnText}>🔊 Listen</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Fallback */}
      {exercises.length === 0 && tipsList.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🤖</Text>
          <Text style={styles.emptyTitle}>Tips are on the way!</Text>
          <Text style={styles.emptyText}>
            Complete your LD screening and practice a few exercises. Your personalised AI tips will appear here every week.
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  loadingText: { marginTop: 12, color: '#546E7A', fontSize: 15 },
  header: {
    backgroundColor: '#1565C0', paddingTop: 56,
    paddingBottom: 20, paddingHorizontal: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 13, color: '#BBDEFB', marginTop: 2 },

  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#263238', marginBottom: 10 },

  badgeRow: { flexDirection: 'row' },
  badgeCard: {
    backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    alignItems: 'center', marginRight: 10, elevation: 2, minWidth: 80,
    borderWidth: 1.5, borderColor: '#FFD54F',
  },
  badgeEmoji: { fontSize: 28, marginBottom: 4 },
  badgeLabel: { fontSize: 11, color: '#37474F', fontWeight: '700', textAlign: 'center' },

  noBadgesCard: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#E3F2FD',
  },
  noBadgesText: { color: '#90A4AE', fontSize: 14 },

  lockedLabel: { fontSize: 12, color: '#90A4AE', marginTop: 10, marginBottom: 6 },
  badgeLocked: {
    backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    alignItems: 'center', marginRight: 10, minWidth: 80, borderWidth: 1, borderColor: '#E0E0E0',
  },
  badgeLockedEmoji: { fontSize: 24, marginBottom: 4 },
  badgeLockedLabel: { fontSize: 11, color: '#BDBDBD', textAlign: 'center' },

  progressStrip: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 16, elevation: 2,
  },
  levelDot: { alignItems: 'center', flex: 1 },
  levelDotCircle: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  levelDotActive: { backgroundColor: '#1976D2' },
  levelDotLocked: { backgroundColor: '#E0E0E0' },
  levelDotText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  levelDotLabel: { fontSize: 9, color: '#90A4AE', textAlign: 'center' },

  streakCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF3E0', marginHorizontal: 16, marginTop: 14,
    borderRadius: 14, padding: 16, borderLeftWidth: 4, borderLeftColor: '#FF6F00',
    elevation: 1,
  },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakEmoji: { fontSize: 30 },
  streakNum: { fontSize: 18, fontWeight: '800', color: '#E65100' },
  streakSub: { fontSize: 12, color: '#BF360C', marginTop: 2 },
  streakBadge: { fontSize: 13, fontWeight: '700', color: '#FF6F00' },

  recCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#1976D2', elevation: 1,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  recTitle: { fontSize: 15, fontWeight: '800', color: '#1565C0', flex: 1 },
  recTag: {
    backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, fontSize: 11, color: '#1976D2', fontWeight: '600',
    textTransform: 'capitalize',
  },
  recDesc: { fontSize: 13, color: '#546E7A', lineHeight: 20, marginBottom: 10 },
  recActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recBtn: {
    backgroundColor: '#1976D2', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  recBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  speakBtn: {
    backgroundColor: '#E3F2FD', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  speakBtnText: { fontSize: 13, color: '#1976D2', fontWeight: '600' },

  tipCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10,
    borderLeftWidth: 3, borderLeftColor: '#F57C00', elevation: 1,
  },
  tipTitle: { fontSize: 15, fontWeight: '800', color: '#E65100', marginBottom: 6 },
  tipDesc: { fontSize: 13, color: '#546E7A', lineHeight: 20, marginBottom: 6 },
  tipDuration: { fontSize: 11, color: '#90A4AE', marginBottom: 8 },

  emptyCard: {
    margin: 16, backgroundColor: '#FFF', borderRadius: 16,
    padding: 24, alignItems: 'center', elevation: 1,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#263238', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#546E7A', textAlign: 'center', lineHeight: 22 },
});

export default RecommendationsScreen;
