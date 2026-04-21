import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Animated, ActivityIndicator,
} from 'react-native';
import Tts from 'react-native-tts';
import { studentAPI } from '../../services/api';

const PASS_THRESHOLD = 70;

const TestQuizScreen = ({ navigation, route }) => {
  const { level } = route.params;
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    loadQuestions();
    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const loadQuestions = async () => {
    try {
      const { questions: qs } = await studentAPI.getTestQuestions(level);
      setQuestions(qs);
      setLoading(false);
      speakQuestion(qs[0]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load test.');
      navigation.goBack();
    }
  };

  const speakQuestion = (q) => {
    if (q?.question_text) {
      Tts.speak(q.question_text, { language: 'en-IN', rate: 0.85 });
    }
  };

  const selectOption = (option) => {
    if (selectedOption !== null) return; // already answered
    setSelectedOption(option);

    const newAnswers = [
      ...answers,
      { questionId: questions[currentIndex].id, studentAnswer: option },
    ];

    Animated.timing(progressAnim, {
      toValue: ((currentIndex + 1) / questions.length) * 100,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setAnswers(newAnswers);
        setCurrentIndex(currentIndex + 1);
        setSelectedOption(null);
        speakQuestion(questions[currentIndex + 1]);
      } else {
        setAnswers(newAnswers);
        handleSubmit(newAnswers);
      }
    }, 700);
  };

  const handleSubmit = async (finalAnswers = answers) => {
    if (submitting) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    const timeTaken = Date.now() - startTime;
    try {
      const result = await studentAPI.submitTest({
        level,
        answers: finalAnswers,
        time_taken_ms: timeTaken,
      });
      navigation.replace('TestResult', { result, level });
    } catch {
      Alert.alert('Error', 'Could not submit test. Please try again.');
      setSubmitting(false);
    }
  };

  const confirmSkip = () => {
    Alert.alert(
      'Submit Test',
      `You have answered ${answers.length} of ${questions.length} questions. Submit now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => handleSubmit() },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Loading Level {level} test…</Text>
      </View>
    );
  }

  if (submitting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Scoring your test…</Text>
        <Text style={styles.loadingSubText}>Getting AI feedback on your answers…</Text>
      </View>
    );
  }

  const question = questions[currentIndex];
  const options = question?.options || [];
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeWarning = timeLeft < 300;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={[styles.timer, timeWarning && styles.timerWarning]}>
          ⏱ {mins}:{String(secs).padStart(2, '0')}
        </Text>
        <Text style={styles.questionCount}>
          {currentIndex + 1} / {questions.length}
        </Text>
        <TouchableOpacity onPress={confirmSkip} style={styles.submitEarlyBtn}>
          <Text style={styles.submitEarlyText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <Animated.View
          style={[styles.progressFill, {
            width: progressAnim.interpolate({
              inputRange: [0, 100], outputRange: ['0%', '100%'],
            }),
          }]}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.categoryTag}>
            {question?.category?.replace(/_/g, ' ')}
          </Text>
          <Text style={styles.questionText}>{question?.question_text}</Text>
          <TouchableOpacity
            onPress={() => Tts.speak(question?.question_text, { language: 'en-IN', rate: 0.8 })}
            style={styles.speakBtn}
            accessibilityLabel="Read question aloud"
          >
            <Text style={styles.speakBtnText}>🔊 Read</Text>
          </TouchableOpacity>
        </View>

        {/* Options */}
        <View style={styles.optionsList}>
          {options.map((opt, i) => {
            const isSelected = selectedOption === opt;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.optionBtn,
                  isSelected && styles.optionSelected,
                ]}
                onPress={() => selectOption(opt)}
                disabled={selectedOption !== null}
                accessibilityRole="button"
                accessibilityLabel={`Option: ${opt}`}
              >
                <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                  <Text style={[styles.optionLetterText, isSelected && { color: '#FFF' }]}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {opt}
                </Text>
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
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F0F4FF', padding: 20,
  },
  loadingText: { marginTop: 12, color: '#546E7A', fontSize: 16, fontWeight: '600' },
  loadingSubText: { marginTop: 6, color: '#90A4AE', fontSize: 13, textAlign: 'center' },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1565C0', paddingHorizontal: 20,
    paddingTop: 48, paddingBottom: 12,
  },
  timer: { fontSize: 16, fontWeight: '800', color: '#BBDEFB' },
  timerWarning: { color: '#FF5252' },
  questionCount: { fontSize: 14, color: '#BBDEFB', fontWeight: '600' },
  submitEarlyBtn: {
    backgroundColor: '#0D47A1', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  submitEarlyText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  progressBg: { height: 4, backgroundColor: '#1976D2' },
  progressFill: { height: '100%', backgroundColor: '#64B5F6' },

  scroll: { flex: 1 },
  questionCard: {
    margin: 16, backgroundColor: '#FFF', borderRadius: 16,
    padding: 20, elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  categoryTag: {
    fontSize: 11, fontWeight: '700', color: '#1976D2',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  questionText: { fontSize: 20, fontWeight: '700', color: '#263238', lineHeight: 30 },
  speakBtn: {
    marginTop: 12, alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  speakBtnText: { color: '#1976D2', fontSize: 13, fontWeight: '600' },

  optionsList: { paddingHorizontal: 16, gap: 10, paddingBottom: 30 },
  optionBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 12,
    padding: 14, borderWidth: 1.5, borderColor: '#E3F2FD',
    elevation: 1,
  },
  optionSelected: { borderColor: '#1976D2', backgroundColor: '#E3F2FD' },
  optionLetter: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F0F4FF', borderWidth: 1.5, borderColor: '#90CAF9',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  optionLetterSelected: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  optionLetterText: { fontSize: 14, fontWeight: '800', color: '#1976D2' },
  optionText: { fontSize: 16, color: '#263238', fontWeight: '500', flex: 1 },
  optionTextSelected: { color: '#1565C0', fontWeight: '700' },
});

export default TestQuizScreen;
