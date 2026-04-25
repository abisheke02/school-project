import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Animated, ActivityIndicator,
} from 'react-native';
import Tts from 'react-native-tts';
import Voice from 'react-native-voice';
import { studentAPI } from '../../services/api';
import {
  fetchExercisesWithFallback,
  queueSessionForSync,
  initOfflineDB,
} from '../../services/offlineCache';

// ─── Word-level dictation scorer (mirrors backend scoreDictation) ─────────────
const scoreDictation = (transcript, expected) => {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().split(/\s+/);
  const spoken = norm(transcript);
  const target = norm(expected);
  const correct = target.filter((w, i) => spoken[i] === w).length;
  return { score: target.length ? Math.round((correct / target.length) * 100) : 0 };
};

// ─── Exercise sub-components ──────────────────────────────────────────────────

const LetterTapExercise = ({ item, onAnswer }) => (
  <View style={styles.optionsGrid}>
    {item.options.map((opt) => (
      <TouchableOpacity key={opt} style={styles.letterBtn} onPress={() => onAnswer(opt, opt === item.correct)} accessibilityLabel={`Letter ${opt}`}>
        <Text style={styles.letterText}>{opt}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const WordBlendExercise = ({ item, onAnswer }) => (
  <View>
    <View style={styles.soundsRow}>
      {item.sounds.map((s, i) => <View key={i} style={styles.soundChip}><Text style={styles.soundText}>/{s}/</Text></View>)}
    </View>
    <View style={styles.optionsGrid}>
      {item.options.map((opt) => (
        <TouchableOpacity key={opt} style={styles.wordBtn} onPress={() => onAnswer(opt, opt === item.correct)}>
          <Text style={styles.wordBtnText}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const RhymeMatchExercise = ({ item, onAnswer }) => (
  <View style={styles.optionsGrid}>
    {item.options.map((opt) => (
      <TouchableOpacity key={opt} style={styles.wordBtn} onPress={() => onAnswer(opt, opt === item.correct)}>
        <Text style={styles.wordBtnText}>{opt}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const WordChoiceExercise = ({ item, onAnswer }) => (
  <View style={styles.optionsCol}>
    {item.options.map((opt) => (
      <TouchableOpacity key={opt} style={styles.optionRow} onPress={() => onAnswer(opt, opt === item.correct)}>
        <Text style={styles.optionText}>{opt}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const FillBlankExercise = ({ item, onAnswer }) => (
  <View>
    <Text style={styles.sentenceText}>{item.sentence}</Text>
    <View style={styles.optionsGrid}>
      {item.options.map((opt) => (
        <TouchableOpacity key={opt} style={styles.wordBtn} onPress={() => onAnswer(opt, opt === item.correct)}>
          <Text style={styles.wordBtnText}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const WordBuilderExercise = ({ item, onAnswer }) => {
  const [selected, setSelected] = useState([]);
  const toggleLetter = (letter, idx) => {
    const key = `${letter}-${idx}`;
    setSelected((prev) => prev.find((s) => s.key === key) ? prev.filter((s) => s.key !== key) : [...prev, { key, letter }]);
  };
  const submit = () => { const word = selected.map((s) => s.letter).join(''); onAnswer(word, word === item.word); setSelected([]); };
  return (
    <View>
      <Text style={styles.hintText}>💡 {item.hint}</Text>
      <View style={styles.selectedWord}>
        {selected.map((s, i) => <View key={i} style={styles.selectedLetter}><Text style={styles.selectedLetterText}>{s.letter}</Text></View>)}
        {selected.length === 0 && <Text style={styles.placeholderText}>Tap letters below →</Text>}
      </View>
      <View style={styles.scrambledRow}>
        {item.scrambled.map((letter, i) => (
          <TouchableOpacity key={i} style={styles.scrambledLetter} onPress={() => toggleLetter(letter, i)}>
            <Text style={styles.scrambledLetterText}>{letter}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={[styles.submitBtn, !selected.length && styles.submitBtnDisabled]} onPress={submit} disabled={!selected.length}>
        <Text style={styles.submitBtnText}>Check ✓</Text>
      </TouchableOpacity>
    </View>
  );
};

const CountTapExercise = ({ item, onAnswer }) => (
  <View>
    <Text style={styles.countEmoji}>{item.prompt}</Text>
    <View style={styles.optionsGrid}>
      {item.options.map((opt) => (
        <TouchableOpacity key={opt} style={styles.numBtn} onPress={() => onAnswer(String(opt), opt === item.count)}>
          <Text style={styles.numBtnText}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const WordProblemExercise = ({ item, onAnswer }) => (
  <View>
    <View style={styles.problemCard}><Text style={styles.problemText}>{item.problem}</Text></View>
    <View style={styles.optionsGrid}>
      {item.options.map((opt) => (
        <TouchableOpacity key={opt} style={styles.numBtn} onPress={() => onAnswer(String(opt), opt === item.correct)}>
          <Text style={styles.numBtnText}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ─── Dictation Exercise (STT via react-native-voice) ─────────────────────────
const DictationExercise = ({ item, onAnswer }) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [sttError, setSttError] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      const heard = (e.value?.[0] || '').toLowerCase().trim();
      setTranscript(heard);
    };
    Voice.onSpeechError = (e) => {
      setSttError(e.error?.message || 'Could not hear you. Try again.');
      setListening(false);
    };
    Voice.onSpeechEnd = () => setListening(false);
    return () => { Voice.destroy().then(Voice.removeAllListeners).catch(() => {}); };
  }, []);

  const startListening = async () => {
    setTranscript('');
    setSttError(null);
    setChecked(false);
    try {
      await Voice.start('en-IN');
      setListening(true);
    } catch {
      setSttError('Microphone unavailable. Check permissions.');
    }
  };

  const stopAndCheck = async () => {
    try { await Voice.stop(); } catch {}
    setListening(false);
    setChecked(true);
    const target = item.word || item.sentence || '';
    const { score } = scoreDictation(transcript || '', target);
    const isCorrect = score >= 80;
    onAnswer(transcript || '(no speech)', isCorrect);
  };

  const expected = item.word || item.sentence || '';

  return (
    <View style={styles.dictationContainer}>
      <Text style={styles.dictationLabel}>{item.hint || 'Say this word out loud:'}</Text>
      <TouchableOpacity
        onPress={() => Tts.speak(expected, { language: 'en-IN', rate: 0.7 })}
        style={styles.dictationWordBox}
        accessibilityLabel={`Hear: ${expected}`}
      >
        <Text style={styles.dictationWord}>{expected}</Text>
        <Text style={styles.dictationHearBtn}>🔊 Tap to hear</Text>
      </TouchableOpacity>

      {transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>You said:</Text>
          <Text style={styles.transcriptText}>"{transcript}"</Text>
        </View>
      ) : null}

      {sttError ? <Text style={styles.sttError}>{sttError}</Text> : null}

      {!checked && (
        <TouchableOpacity
          style={[styles.micBtn, listening && styles.micBtnActive]}
          onPress={listening ? stopAndCheck : startListening}
          accessibilityLabel={listening ? 'Stop recording' : 'Tap to speak'}
        >
          <Text style={styles.micIcon}>{listening ? '⏹' : '🎤'}</Text>
          <Text style={styles.micBtnText}>{listening ? 'Stop & Check' : 'Tap to Speak'}</Text>
        </TouchableOpacity>
      )}

      {listening && (
        <View style={styles.listeningIndicator}>
          <ActivityIndicator size="small" color="#D32F2F" />
          <Text style={styles.listeningText}> Listening…</Text>
        </View>
      )}
    </View>
  );
};

// ─── ReadAloud Exercise (STT-scored speaking) ─────────────────────────────────
const ReadAloudExercise = ({ item, onAnswer }) => {
  const [phase, setPhase] = useState('ready'); // ready | listening | done
  const [transcript, setTranscript] = useState('');
  const [sttError, setSttError] = useState(null);

  const text = item.text || item.sentence || item.word || '';

  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      const heard = (e.value?.[0] || '').toLowerCase().trim();
      setTranscript(heard);
    };
    Voice.onSpeechError = (e) => {
      setSttError(e.error?.message || 'Could not hear you.');
      setPhase('ready');
    };
    Voice.onSpeechEnd = () => setPhase('done');
    return () => { Voice.destroy().then(Voice.removeAllListeners).catch(() => {}); };
  }, []);

  const startReading = async () => {
    setTranscript('');
    setSttError(null);
    try {
      await Voice.start('en-IN');
      setPhase('listening');
    } catch {
      setSttError('Microphone unavailable.');
    }
  };

  const stopAndScore = async () => {
    try { await Voice.stop(); } catch {}
    setPhase('done');
  };

  const submitReading = () => {
    const { score } = scoreDictation(transcript, text);
    const isCorrect = score >= 70;
    onAnswer(transcript || '(no speech)', isCorrect);
    setPhase('ready');
    setTranscript('');
  };

  const retry = () => { setTranscript(''); setPhase('ready'); };

  return (
    <View style={styles.readAloudContainer}>
      <Text style={styles.readAloudLabel}>{item.hint || 'Read this aloud:'}</Text>

      {/* Text to read — large, dyslexia-friendly */}
      <View style={styles.readAloudTextBox}>
        <Text style={styles.readAloudText}>{text}</Text>
        <TouchableOpacity
          onPress={() => Tts.speak(text, { language: 'en-IN', rate: 0.75 })}
          style={styles.readAloudHearBtn}
          accessibilityLabel="Hear the text"
        >
          <Text style={styles.readAloudHearText}>🔊 Hear it first</Text>
        </TouchableOpacity>
      </View>

      {/* Transcript */}
      {transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>You read:</Text>
          <Text style={styles.transcriptText}>"{transcript}"</Text>
        </View>
      ) : null}

      {sttError ? <Text style={styles.sttError}>{sttError}</Text> : null}

      {phase === 'ready' && !transcript && (
        <TouchableOpacity style={styles.micBtn} onPress={startReading} accessibilityLabel="Start reading aloud">
          <Text style={styles.micIcon}>🎤</Text>
          <Text style={styles.micBtnText}>Start Reading</Text>
        </TouchableOpacity>
      )}

      {phase === 'listening' && (
        <>
          <TouchableOpacity style={[styles.micBtn, styles.micBtnActive]} onPress={stopAndScore} accessibilityLabel="Stop recording">
            <Text style={styles.micIcon}>⏹</Text>
            <Text style={styles.micBtnText}>Done Reading</Text>
          </TouchableOpacity>
          <View style={styles.listeningIndicator}>
            <ActivityIndicator size="small" color="#D32F2F" />
            <Text style={styles.listeningText}> Listening…</Text>
          </View>
        </>
      )}

      {phase === 'done' && transcript && (
        <View style={styles.readAloudActions}>
          <TouchableOpacity style={styles.retryBtn} onPress={retry}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitBtn} onPress={submitReading}>
            <Text style={styles.submitBtnText}>Submit ✓</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ─── Item renderer router ─────────────────────────────────────────────────────
const renderItem = (type, item, onAnswer) => {
  switch (type) {
    case 'letter_tap':   return <LetterTapExercise item={item} onAnswer={onAnswer} />;
    case 'word_blend':   return <WordBlendExercise item={item} onAnswer={onAnswer} />;
    case 'rhyme_match':  return <RhymeMatchExercise item={item} onAnswer={onAnswer} />;
    case 'word_choice':  return <WordChoiceExercise item={item} onAnswer={onAnswer} />;
    case 'fill_blank':   return <FillBlankExercise item={item} onAnswer={onAnswer} />;
    case 'word_builder': return <WordBuilderExercise item={item} onAnswer={onAnswer} />;
    case 'count_tap':    return <CountTapExercise item={item} onAnswer={onAnswer} />;
    case 'word_problem': return <WordProblemExercise item={item} onAnswer={onAnswer} />;
    case 'dictation':    return <DictationExercise item={item} onAnswer={onAnswer} />;
    case 'read_aloud':   return <ReadAloudExercise item={item} onAnswer={onAnswer} />;
    default: return <Text style={{ color: '#999', padding: 16 }}>Exercise type not supported yet.</Text>;
  }
};

// ─── Main screen ─────────────────────────────────────────────────────────────
const ExerciseSessionScreen = ({ navigation, route }) => {
  const { exerciseType } = route.params;
  const [exercises, setExercises] = useState([]);
  const [exIndex, setExIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const offlineQueue = useRef([]);  // queued attempts for offline mode
  const itemStartTime = useRef(Date.now());
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initOfflineDB().catch(() => {});
    initSession();
  }, []);

  const initSession = async () => {
    try {
      // Use offline-fallback fetcher — returns online exercises or SQLite cache
      const { exercises: exs, source } = await fetchExercisesWithFallback(exerciseType);
      setIsOffline(source === 'offline');

      let sid = null;
      if (source === 'online') {
        const { session_id } = await studentAPI.startSession(exerciseType);
        sid = session_id;
      }

      setExercises(exs);
      setSessionId(sid);
      setLoading(false);
      if (exs.length) speakPrompt(exs[0]);
    } catch {
      Alert.alert('Error', 'Could not load exercises.');
      navigation.goBack();
    }
  };

  const speakPrompt = (exercise) => {
    if (!exercise?.content?.items?.length) return;
    const item = exercise.content.items[0];
    const text = item.prompt || item.sentence || item.problem || item.word || exercise.instruction;
    if (text) Tts.speak(text, { language: 'en-IN', rate: 0.85 });
  };

  const updateProgress = (exIdx, itemIdx, totalItems) => {
    const overall = ((exIdx * totalItems + itemIdx) / (exercises.length * totalItems)) * 100;
    Animated.timing(progressAnim, { toValue: overall, duration: 300, useNativeDriver: false }).start();
  };

  const handleAnswer = async (studentAnswer, isCorrect) => {
    const responseTimeMs = Date.now() - itemStartTime.current;
    const currentExercise = exercises[exIndex];
    const items = currentExercise.content.items || [];
    const currentItem = items[itemIndex];

    setFeedback({ correct: isCorrect, message: isCorrect ? 'Correct! 🎉' : `Correct: ${currentItem.correct || currentItem.word || currentItem.count || ''}` });
    if (!isCorrect) Tts.speak("Let's try again.", { language: 'en-IN', rate: 0.9 });

    const newAnswers = [
      ...answers,
      {
        questionId: currentItem.id || `item-${itemIndex}`,
        studentAnswer,
        correctAnswer: String(currentItem.correct || currentItem.word || currentItem.count || ''),
        isCorrect,
        responseTimeMs,
        errorType: exerciseType,
      },
    ];

    setTimeout(async () => {
      setFeedback(null);

      if (itemIndex + 1 < items.length) {
        setItemIndex(itemIndex + 1);
        setAnswers(newAnswers);
        itemStartTime.current = Date.now();
        updateProgress(exIndex, itemIndex + 1, items.length);
        const next = items[itemIndex + 1];
        const text = next.prompt || next.sentence || next.problem || next.word || '';
        if (text) Tts.speak(text, { language: 'en-IN', rate: 0.85 });
      } else {
        // Exercise complete
        const correctCount = newAnswers.filter((a) => a.isCorrect).length;
        const scorePercent = Math.round((correctCount / newAnswers.length) * 100);
        const timeTakenMs = newAnswers.reduce((t, a) => t + a.responseTimeMs, 0);

        const attemptPayload = {
          exercise_id: currentExercise.id,
          exercise_type: exerciseType,
          answers: newAnswers,
          score_percent: scorePercent,
          time_taken_ms: timeTakenMs,
        };

        if (isOffline || !sessionId) {
          // Queue for later sync
          offlineQueue.current.push({
            exerciseId: currentExercise.id,
            exerciseType,
            answers: newAnswers,
            scorePercent,
            timeTakenMs,
          });
        } else {
          try {
            await studentAPI.recordAttempt(sessionId, attemptPayload);
          } catch {
            offlineQueue.current.push({ exerciseId: currentExercise.id, exerciseType, answers: newAnswers, scorePercent, timeTakenMs });
          }
        }

        const newTotalScore = (totalScore + scorePercent) / (exIndex + 1);
        setTotalScore(newTotalScore);

        if (exIndex + 1 < exercises.length) {
          setExIndex(exIndex + 1);
          setItemIndex(0);
          setAnswers([]);
          itemStartTime.current = Date.now();
          updateProgress(exIndex + 1, 0, exercises[exIndex + 1].content.items?.length || 1);
          speakPrompt(exercises[exIndex + 1]);
        } else {
          // All exercises done — finalize
          if (!isOffline && sessionId) {
            try { await studentAPI.completeSession(sessionId, { total_score: newTotalScore }); } catch {}
          }
          // Flush offline queue
          if (offlineQueue.current.length) {
            await queueSessionForSync({ sessions: offlineQueue.current });
            offlineQueue.current = [];
          }
          setFinished(true);
        }
      }
    }, 900);
  };

  // ── Render states ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Loading exercises…</Text>
      </View>
    );
  }

  if (finished) {
    const scoreColor = totalScore >= 80 ? '#388E3C' : totalScore >= 50 ? '#F57C00' : '#D32F2F';
    return (
      <View style={styles.finishContainer}>
        <Text style={styles.finishEmoji}>{totalScore >= 80 ? '🏆' : totalScore >= 50 ? '👏' : '💪'}</Text>
        <Text style={styles.finishTitle}>Session Complete!</Text>
        <Text style={[styles.finishScore, { color: scoreColor }]}>{Math.round(totalScore)}%</Text>
        {isOffline && (
          <Text style={styles.offlineBadge}>📶 Offline mode — saved for sync</Text>
        )}
        <Text style={styles.finishSub}>Great practice today. Keep it up!</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('PracticeHome')}>
          <Text style={styles.doneBtnText}>Back to Practice</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentExercise = exercises[exIndex];
  if (!currentExercise) return null;

  const items = currentExercise.content.items || [];
  const currentItem = items[itemIndex] || {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
      {/* Offline banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>📶 Offline mode — progress saved locally</Text>
        </View>
      )}

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[styles.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
          }]}
        />
      </View>

      {/* Exercise header */}
      <View style={styles.exHeader}>
        <Text style={styles.exTitle}>{currentExercise.title}</Text>
        <Text style={styles.exProgress}>{itemIndex + 1} / {items.length}</Text>
      </View>

      <Text style={styles.instruction}>{currentExercise.instruction}</Text>

      {/* Prompt card */}
      {(currentItem.prompt || currentItem.sentence || currentItem.problem) && (
        <View style={styles.promptCard}>
          <Text style={styles.promptText}>
            {currentItem.prompt || currentItem.sentence || currentItem.problem}
          </Text>
          <TouchableOpacity
            onPress={() => {
              const text = currentItem.prompt || currentItem.sentence || currentItem.problem;
              Tts.speak(text, { language: 'en-IN', rate: 0.8 });
            }}
            style={styles.speakBtn}
            accessibilityLabel="Hear the question"
          >
            <Text style={styles.speakBtnText}>🔊 Hear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feedback */}
      {feedback && (
        <View style={[styles.feedbackBanner, { backgroundColor: feedback.correct ? '#E8F5E9' : '#FFEBEE' }]}>
          <Text style={[styles.feedbackText, { color: feedback.correct ? '#1B5E20' : '#B71C1C' }]}>
            {feedback.message}
          </Text>
        </View>
      )}

      {/* Exercise content */}
      <View style={styles.exerciseArea}>
        {renderItem(currentExercise.content.type, currentItem, handleAnswer)}
      </View>
    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF' },
  loadingText: { marginTop: 12, color: '#546E7A', fontSize: 15 },

  offlineBanner: { backgroundColor: '#FFF3E0', paddingVertical: 6, paddingHorizontal: 16 },
  offlineBannerText: { color: '#E65100', fontSize: 12, fontWeight: '600' },

  progressContainer: { height: 6, backgroundColor: '#E3F2FD', width: '100%' },
  progressFill: { height: '100%', backgroundColor: '#1976D2' },

  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  exTitle: { fontSize: 18, fontWeight: '800', color: '#1565C0', flex: 1 },
  exProgress: { fontSize: 13, color: '#78909C', marginLeft: 8 },
  instruction: { fontSize: 14, color: '#546E7A', paddingHorizontal: 20, marginBottom: 12 },

  promptCard: { backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2 },
  promptText: { fontSize: 20, fontWeight: '700', color: '#263238', lineHeight: 28 },
  speakBtn: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  speakBtnText: { color: '#1976D2', fontSize: 13, fontWeight: '600' },

  feedbackBanner: { marginHorizontal: 16, borderRadius: 10, padding: 12, marginBottom: 10 },
  feedbackText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },

  exerciseArea: { paddingHorizontal: 16, paddingBottom: 40 },

  // Letter tap
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  letterBtn: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1976D2', elevation: 2 },
  letterText: { fontSize: 36, fontWeight: '800', color: '#1565C0' },

  soundsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  soundChip: { backgroundColor: '#E3F2FD', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  soundText: { fontSize: 18, color: '#1565C0', fontWeight: '700' },
  wordBtn: { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1.5, borderColor: '#90CAF9', paddingHorizontal: 18, paddingVertical: 12, minWidth: '44%', alignItems: 'center' },
  wordBtnText: { fontSize: 17, color: '#263238', fontWeight: '600' },

  optionsCol: { gap: 10 },
  optionRow: { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1.5, borderColor: '#90CAF9', paddingHorizontal: 18, paddingVertical: 14 },
  optionText: { fontSize: 16, color: '#263238', fontWeight: '600' },

  sentenceText: { fontSize: 20, fontWeight: '700', color: '#263238', lineHeight: 30, marginBottom: 16, textAlign: 'center' },

  hintText: { fontSize: 14, color: '#546E7A', marginBottom: 12 },
  selectedWord: { flexDirection: 'row', minHeight: 52, backgroundColor: '#FFF', borderRadius: 10, borderWidth: 2, borderColor: '#1976D2', alignItems: 'center', paddingHorizontal: 10, marginBottom: 14, flexWrap: 'wrap', gap: 6 },
  selectedLetter: { width: 36, height: 36, backgroundColor: '#1976D2', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  selectedLetterText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  placeholderText: { color: '#B0BEC5', fontSize: 14 },
  scrambledRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  scrambledLetter: { width: 50, height: 50, backgroundColor: '#E3F2FD', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#90CAF9' },
  scrambledLetterText: { fontSize: 22, fontWeight: '800', color: '#1565C0' },
  submitBtn: { backgroundColor: '#1976D2', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#B0BEC5' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  countEmoji: { fontSize: 36, textAlign: 'center', marginVertical: 16, lineHeight: 50 },
  numBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#7B1FA2', elevation: 2 },
  numBtnText: { fontSize: 28, fontWeight: '800', color: '#4A148C' },

  problemCard: { backgroundColor: '#F3E5F5', borderRadius: 12, padding: 16, marginBottom: 16 },
  problemText: { fontSize: 17, color: '#311B92', fontWeight: '600', lineHeight: 26 },

  // Dictation
  dictationContainer: { alignItems: 'center', paddingVertical: 8 },
  dictationLabel: { fontSize: 15, color: '#546E7A', marginBottom: 12, fontWeight: '600' },
  dictationWordBox: { backgroundColor: '#E8F5E9', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 18, alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#A5D6A7' },
  dictationWord: { fontSize: 34, fontWeight: '900', color: '#1B5E20', letterSpacing: 2 },
  dictationHearBtn: { fontSize: 13, color: '#388E3C', marginTop: 6 },
  transcriptBox: { backgroundColor: '#FFF8E1', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FFE082', alignItems: 'center' },
  transcriptLabel: { fontSize: 11, color: '#F57F17', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  transcriptText: { fontSize: 17, color: '#263238', fontWeight: '700' },
  sttError: { color: '#D32F2F', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  micBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1976D2', borderRadius: 50, paddingHorizontal: 28, paddingVertical: 16, elevation: 4, marginTop: 8 },
  micBtnActive: { backgroundColor: '#D32F2F' },
  micIcon: { fontSize: 22, marginRight: 10 },
  micBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  listeningIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  listeningText: { color: '#D32F2F', fontSize: 13, fontWeight: '600' },

  // ReadAloud exercise
  readAloudContainer: { alignItems: 'center', paddingVertical: 8 },
  readAloudLabel: { fontSize: 15, color: '#546E7A', marginBottom: 12, fontWeight: '600' },
  readAloudTextBox: { backgroundColor: '#EDE7F6', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#CE93D8', width: '100%' },
  readAloudText: { fontSize: 22, fontWeight: '800', color: '#311B92', lineHeight: 34, textAlign: 'center', letterSpacing: 0.5 },
  readAloudHearBtn: { marginTop: 10, backgroundColor: '#E8EAF6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  readAloudHearText: { fontSize: 13, color: '#3949AB', fontWeight: '600' },
  readAloudActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  retryBtn: { backgroundColor: '#ECEFF1', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  retryBtnText: { color: '#546E7A', fontSize: 15, fontWeight: '700' },

  // Finish screen
  finishContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4FF', padding: 30 },
  finishEmoji: { fontSize: 72, marginBottom: 16 },
  finishTitle: { fontSize: 26, fontWeight: '800', color: '#263238', marginBottom: 8 },
  finishScore: { fontSize: 60, fontWeight: '900', marginBottom: 8 },
  offlineBadge: { fontSize: 13, color: '#E65100', backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  finishSub: { fontSize: 16, color: '#546E7A', marginBottom: 32, textAlign: 'center' },
  doneBtn: { backgroundColor: '#1976D2', borderRadius: 14, paddingHorizontal: 36, paddingVertical: 16 },
  doneBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});

export default ExerciseSessionScreen;
