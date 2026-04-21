import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Animated, ScrollView,
} from 'react-native';
import Tts from 'react-native-tts';
import api from '../../services/api';

const CATEGORY_LABELS = {
  letter_recognition: 'Letters',
  rhyme_detection: 'Rhymes',
  phoneme_blending: 'Sounds',
  number_sense: 'Numbers',
};

const CATEGORY_COLORS = {
  letter_recognition: '#7B1FA2',
  rhyme_detection: '#1976D2',
  phoneme_blending: '#00796B',
  number_sense: '#E64A19',
};

const ScreeningQuizScreen = ({ navigation }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [quizStartTime] = useState(Date.now());
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Load questions on mount
  useEffect(() => {
    api.get('/screening/questions')
      .then(({ questions: qs }) => {
        setQuestions(qs);
        setQuestionStartTime(Date.now());
        setLoading(false);
      })
      .catch(() => {
        Alert.alert('Error', 'Could not load quiz. Please try again.');
        navigation.goBack();
      });
  }, []);

  // Animate progress bar
  useEffect(() => {
    if (questions.length === 0) return;
    Animated.timing(progressAnim, {
      toValue: (currentIdx / questions.length) * 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIdx, questions.length]);

  // Speak question text via TTS when question changes
  useEffect(() => {
    if (!questions[currentIdx]) return;
    Tts.setDefaultRate(0.85);
    Tts.setDefaultLanguage('en-IN');
    Tts.speak(questions[currentIdx].question_text);
    setQuestionStartTime(Date.now());
    setSelected(null);
  }, [currentIdx]);

  const handleAnswer = useCallback((option) => {
    if (selected !== null) return; // already answered
    setSelected(option);

    const q = questions[currentIdx];
    const responseTimeMs = Date.now() - questionStartTime;
    const isCorrect = option === q.correct_answer;

    const answerRecord = {
      question_id: q.id,
      category: q.category,
      ld_target: q.ld_target,
      difficulty: q.difficulty,
      correct_answer: q.correct_answer,
      student_answer: option,
      is_correct: isCorrect,
      response_time_ms: responseTimeMs,
    };

    const updatedAnswers = [...answers, answerRecord];
    setAnswers(updatedAnswers);

    // Short pause then advance
    setTimeout(() => {
      if (currentIdx + 1 >= questions.length) {
        handleSubmit(updatedAnswers);
      } else {
        setCurrentIdx((i) => i + 1);
      }
    }, 600);
  }, [selected, currentIdx, questions, answers, questionStartTime]);

  const handleSubmit = async (finalAnswers) => {
    setSubmitting(true);
    const durationSeconds = Math.round((Date.now() - quizStartTime) / 1000);
    try {
      const result = await api.post('/screening/submit', {
        answers: finalAnswers,
        duration_seconds: durationSeconds,
      });
      navigation.replace('ScreeningResult', { result });
    } catch (err) {
      Alert.alert('Error', 'Could not submit quiz. Please check your connection and try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Loading your quiz…</Text>
      </View>
    );
  }

  if (submitting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Analysing your answers…</Text>
        <Text style={styles.loadingSubtext}>This takes a few seconds</Text>
      </View>
    );
  }

  const q = questions[currentIdx];
  if (!q) return null;

  const options = q.options_json?.options || [];
  const catColor = CATEGORY_COLORS[q.category] || '#1976D2';
  const progressPercent = questions.length > 0 ? ((currentIdx / questions.length) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: catColor,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentIdx + 1} of {questions.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Category badge */}
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '20', borderColor: catColor }]}>
          <Text style={[styles.categoryText, { color: catColor }]}>
            {CATEGORY_LABELS[q.category] || q.category}
          </Text>
        </View>

        {/* Question */}
        <Text style={styles.questionText}>{q.question_text}</Text>

        {/* TTS replay button */}
        <TouchableOpacity
          style={styles.listenBtn}
          onPress={() => Tts.speak(q.question_text)}
          accessibilityRole="button"
          accessibilityLabel="Listen to question again"
        >
          <Text style={styles.listenBtnText}>🔊 Listen again</Text>
        </TouchableOpacity>

        {/* Answer options */}
        <View style={styles.optionsGrid}>
          {options.map((opt, idx) => {
            const isSelected = selected === opt;
            const isCorrect = selected !== null && opt === q.correct_answer;
            const isWrong = isSelected && opt !== q.correct_answer;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionBtn,
                  isSelected && styles.optionSelected,
                  isCorrect && styles.optionCorrect,
                  isWrong && styles.optionWrong,
                ]}
                onPress={() => handleAnswer(opt)}
                disabled={selected !== null}
                accessibilityRole="button"
                accessibilityLabel={`Option ${idx + 1}: ${opt}`}
              >
                <Text style={[
                  styles.optionText,
                  (isSelected || isCorrect) && styles.optionTextSelected,
                ]}>
                  {opt}
                </Text>
                {isCorrect && <Text style={styles.feedbackEmoji}>✓</Text>}
                {isWrong && <Text style={styles.feedbackEmoji}>✗</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF', gap: 12 },
  loadingText: { fontSize: 18, fontWeight: '700', color: '#1565C0', marginTop: 16 },
  loadingSubtext: { fontSize: 14, color: '#78909C' },

  header: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14 },
  progressBarBg: { height: 8, backgroundColor: '#E3F2FD', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, color: '#78909C', textAlign: 'right' },

  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  categoryBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, marginBottom: 18,
  },
  categoryText: { fontSize: 13, fontWeight: '700' },

  questionText: {
    fontSize: 20, fontWeight: '700', color: '#1A237E', lineHeight: 30,
    marginBottom: 16,
  },

  listenBtn: {
    alignSelf: 'flex-start', backgroundColor: '#E3F2FD', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 28,
  },
  listenBtnText: { fontSize: 14, color: '#1565C0', fontWeight: '600' },

  optionsGrid: { gap: 12 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', borderWidth: 2, borderColor: '#CFD8DC',
    borderRadius: 14, paddingHorizontal: 20, paddingVertical: 16, minHeight: 56,
  },
  optionSelected: { borderColor: '#1976D2', backgroundColor: '#E3F2FD' },
  optionCorrect: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
  optionWrong: { borderColor: '#C62828', backgroundColor: '#FFEBEE' },
  optionText: { fontSize: 17, color: '#37474F', fontWeight: '600', flex: 1 },
  optionTextSelected: { color: '#1A237E' },
  feedbackEmoji: { fontSize: 20, marginLeft: 8 },
});

export default ScreeningQuizScreen;
