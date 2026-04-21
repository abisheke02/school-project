import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { studentAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const LD_TYPE_LABELS = {
  dyslexia: 'Dyslexia',
  dysgraphia: 'Dysgraphia',
  dyscalculia: 'Dyscalculia',
  mixed: 'Mixed LD',
  not_detected: 'No LD Detected',
};

const LEVEL_LABELS = { 1: 'Starter', 2: 'Basic', 3: 'Intermediate', 4: 'Advanced', 5: 'Mastery' };

const ERROR_COLORS = { phonics: '#7C3AED', reading: '#2563EB', writing: '#EA580C', math: '#16A34A' };

// Minimal inline bar chart using View widths — no extra library needed
const SparkBar = ({ data }) => {
  const max = Math.max(...data.map((d) => Number(d.avg_score) || 0), 1);
  return (
    <View style={sparkStyles.container}>
      {data.map((d, i) => (
        <View key={i} style={sparkStyles.barWrap}>
          <View
            style={[
              sparkStyles.bar,
              {
                height: Math.max(4, Math.round((Number(d.avg_score) / max) * 48)),
                backgroundColor: Number(d.avg_score) >= 70 ? '#22C55E'
                  : Number(d.avg_score) >= 50 ? '#F59E0B' : '#EF4444',
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
};

const sparkStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', height: 52, gap: 3 },
  barWrap: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: 3, minHeight: 4 },
});

const StudentDashboard = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [{ profile: p }, analyticsData] = await Promise.all([
        studentAPI.getMyProfile(),
        studentAPI.getMyAnalytics().catch(() => null),
      ]);
      setProfile(p);
      setAnalytics(analyticsData);
    } catch {
      Alert.alert('Error', 'Could not load your profile.');
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const screeningDone = profile?.ld_type != null;
  const levelPercent = profile ? ((profile.current_level - 1) / 4) * 100 : 0;
  const trend = analytics?.trend || [];
  const weakAreas = analytics?.weakAreas || [];
  const timeToday = analytics?.profile?.total_minutes_today ?? 0;

  // This-week vs last-week average
  const recentTrend = trend.slice(-7);
  const thisWeekAvg = recentTrend.length
    ? Math.round(recentTrend.reduce((s, r) => s + Number(r.avg_score), 0) / recentTrend.length)
    : null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {profile?.name || user?.name || 'Student'} 👋</Text>
          <Text style={styles.subGreeting}>Class {profile?.class_grade || '—'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Streak + time today row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#FF6F00' }]}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValue}>{profile?.streak_count ?? 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#1976D2' }]}>
          <Text style={styles.statEmoji}>📚</Text>
          <Text style={styles.statValue}>{timeToday}</Text>
          <Text style={styles.statLabel}>Min Today</Text>
        </View>
        {thisWeekAvg != null && (
          <View style={[styles.statCard, { borderLeftColor: '#22C55E' }]}>
            <Text style={styles.statEmoji}>📊</Text>
            <Text style={styles.statValue}>{thisWeekAvg}%</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
        )}
      </View>

      {/* Level progress */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Level</Text>
        <View style={styles.levelRow}>
          <Text style={styles.levelBadge}>Level {profile?.current_level ?? 1}</Text>
          <Text style={styles.levelLabel}>{LEVEL_LABELS[profile?.current_level ?? 1]}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${levelPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(levelPercent)}% through Level {profile?.current_level ?? 1}</Text>
      </View>

      {/* 14-day score trend */}
      {trend.length > 2 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>14-Day Score Trend</Text>
            <Text style={styles.cardSub}>{trend.length} days tracked</Text>
          </View>
          <SparkBar data={trend} />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.legendText}>≥70%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>50–70%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>&lt;50%</Text>
            </View>
          </View>
        </View>
      )}

      {/* Weak areas */}
      {weakAreas.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Needs Practice</Text>
          {weakAreas.map((area) => {
            const maxCount = Math.max(...weakAreas.map((a) => Number(a.count)));
            const pct = Math.round((Number(area.count) / maxCount) * 100);
            return (
              <View key={area.error_type} style={styles.weakRow}>
                <Text style={styles.weakLabel}>
                  {area.error_type?.replace('_', ' ')}
                </Text>
                <View style={styles.weakBarBg}>
                  <View
                    style={[
                      styles.weakBarFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: ERROR_COLORS[area.error_type] || '#94A3B8',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.weakCount}>{area.count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* LD Type card */}
      {screeningDone ? (
        <View style={[styles.card, styles.ldCard]}>
          <Text style={styles.cardTitle}>Your Learning Profile</Text>
          <Text style={styles.ldType}>{LD_TYPE_LABELS[profile.ld_type]}</Text>
          <View style={styles.riskRow}>
            <Text style={styles.riskLabel}>Risk Score</Text>
            <View style={styles.riskBar}>
              <View
                style={[
                  styles.riskFill,
                  { width: `${profile.ld_risk_score ?? 0}%` },
                  profile.ld_risk_score > 70 ? styles.riskHigh
                    : profile.ld_risk_score > 40 ? styles.riskMed
                    : styles.riskLow,
                ]}
              />
            </View>
            <Text style={styles.riskScore}>{profile.ld_risk_score ?? 0}/100</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.card, styles.screeningCTA]}
          onPress={() => navigation.navigate('ScreeningIntro')}
          accessibilityRole="button"
          accessibilityLabel="Start LD screening quiz"
        >
          <Text style={styles.ctaTitle}>Complete your LD Screening</Text>
          <Text style={styles.ctaBody}>
            Take the 10-minute quiz so we can personalise your exercises.
          </Text>
          <Text style={styles.ctaButton}>Start Quiz →</Text>
        </TouchableOpacity>
      )}

      {/* Today's exercises */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Exercises</Text>
        {!screeningDone && (
          <Text style={styles.comingSoon}>
            Complete your screening to unlock personalised exercises.
          </Text>
        )}
        <View style={styles.exerciseList}>
          {[
            { label: 'Phonics Practice', emoji: '🔤', type: 'phonics' },
            { label: 'Word Reading', emoji: '📖', type: 'reading' },
            { label: 'Number Sense', emoji: '🔢', type: 'math' },
          ].map((ex) => (
            <TouchableOpacity
              key={ex.type}
              style={styles.exerciseItem}
              onPress={() => navigation.navigate('ExerciseSession', { exerciseType: ex.type })}
              accessibilityRole="button"
              accessibilityLabel={`Start ${ex.label}`}
            >
              <Text style={styles.exerciseEmoji}>{ex.emoji}</Text>
              <Text style={styles.exerciseName}>{ex.label}</Text>
              <Text style={styles.exerciseArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20,
    backgroundColor: '#1565C0',
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  subGreeting: { fontSize: 14, color: '#BBDEFB', marginTop: 2 },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#0D47A1', borderRadius: 8 },
  logoutText: { color: '#FFF', fontSize: 13 },

  statsRow: {
    flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16,
  },
  statCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    borderLeftWidth: 3, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#263238' },
  statLabel: { fontSize: 11, color: '#78909C', marginTop: 2 },

  card: {
    backgroundColor: '#FFF', marginHorizontal: 16, marginTop: 14,
    borderRadius: 14, padding: 18, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#263238', marginBottom: 14 },
  cardSub: { fontSize: 12, color: '#90A4AE' },

  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  levelBadge: {
    backgroundColor: '#1976D2', color: '#FFF', fontWeight: '800',
    fontSize: 14, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  levelLabel: { fontSize: 16, color: '#37474F', fontWeight: '600' },
  progressBar: { height: 12, backgroundColor: '#E3F2FD', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1976D2', borderRadius: 6 },
  progressText: { fontSize: 12, color: '#78909C', marginTop: 6 },

  legendRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#78909C' },

  weakRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  weakLabel: { fontSize: 13, color: '#546E7A', width: 72, textTransform: 'capitalize' },
  weakBarBg: { flex: 1, height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  weakBarFill: { height: '100%', borderRadius: 4 },
  weakCount: { fontSize: 12, color: '#90A4AE', width: 28, textAlign: 'right' },

  ldCard: { borderTopWidth: 3, borderTopColor: '#7B1FA2' },
  ldType: { fontSize: 20, fontWeight: '800', color: '#7B1FA2', marginBottom: 14 },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riskLabel: { fontSize: 13, color: '#546E7A', width: 70 },
  riskBar: { flex: 1, height: 10, backgroundColor: '#F3E5F5', borderRadius: 5, overflow: 'hidden' },
  riskFill: { height: '100%', borderRadius: 5 },
  riskLow: { backgroundColor: '#4CAF50' },
  riskMed: { backgroundColor: '#FF9800' },
  riskHigh: { backgroundColor: '#F44336' },
  riskScore: { fontSize: 13, fontWeight: '700', color: '#37474F', width: 48 },

  screeningCTA: { borderTopWidth: 3, borderTopColor: '#1976D2' },
  ctaTitle: { fontSize: 17, fontWeight: '800', color: '#1565C0', marginBottom: 8 },
  ctaBody: { fontSize: 14, color: '#546E7A', lineHeight: 20, marginBottom: 16 },
  ctaButton: { fontSize: 15, fontWeight: '700', color: '#1976D2' },

  comingSoon: { fontSize: 13, color: '#90A4AE', marginBottom: 12 },
  exerciseList: { gap: 8 },
  exerciseItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F0F4FF', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 14, minHeight: 48,
  },
  exerciseEmoji: { fontSize: 20, marginRight: 6 },
  exerciseName: { fontSize: 15, color: '#37474F', fontWeight: '600', flex: 1 },
  exerciseArrow: { fontSize: 16, color: '#1976D2' },
});

export default StudentDashboard;
