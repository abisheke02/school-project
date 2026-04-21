import React, { useEffect, useState } from 'react';
import StudentTestLevels from './test/StudentTestLevels';
import StudentTestQuiz from './test/StudentTestQuiz';
import StudentTestResult from './test/StudentTestResult';

// Single-page state machine: levels → quiz → result → levels
const VIEWS = { LEVELS: 'levels', QUIZ: 'quiz', RESULT: 'result' };

const StudentTestSpace = () => {
  const [view, setView] = useState(VIEWS.LEVELS);
  const [activeLevel, setActiveLevel] = useState(null);
  const [result, setResult] = useState(null);

  const startTest = (level) => {
    setActiveLevel(level);
    setView(VIEWS.QUIZ);
  };

  const handleResult = (res) => {
    setResult(res);
    setView(VIEWS.RESULT);
  };

  const backToLevels = () => {
    setActiveLevel(null);
    setResult(null);
    setView(VIEWS.LEVELS);
  };

  if (view === VIEWS.QUIZ) {
    return <StudentTestQuiz level={activeLevel} onResult={handleResult} onBack={backToLevels} />;
  }
  if (view === VIEWS.RESULT) {
    return <StudentTestResult result={result} level={activeLevel} onRetry={() => startTest(activeLevel)} onDone={backToLevels} />;
  }
  return <StudentTestLevels onStart={startTest} />;
};

export default StudentTestSpace;
