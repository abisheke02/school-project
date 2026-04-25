import mixpanel from 'mixpanel-browser';

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
const IS_PROD = import.meta.env.PROD;

let initialized = false;

export const initAnalytics = () => {
  if (!TOKEN || initialized) return;
  mixpanel.init(TOKEN, {
    debug: !IS_PROD,
    track_pageview: true,
    persistence: 'localStorage',
  });
  initialized = true;
};

const track = (event, props = {}) => {
  if (!initialized) return;
  try {
    mixpanel.track(event, { ...props, platform: 'web' });
  } catch {}
};

export const identifyUser = (user) => {
  if (!initialized || !user?.id) return;
  try {
    mixpanel.identify(user.id);
    mixpanel.people.set({
      $name: user.name,
      role: user.role,
      school_id: user.school_id || user.schoolId,
      plan: user.plan_type || 'free',
    });
  } catch {}
};

export const resetAnalytics = () => {
  if (!initialized) return;
  try { mixpanel.reset(); } catch {}
};

// ─── Event helpers ────────────────────────────────────────────────────────────

export const trackLogin = (method, role) =>
  track('Login', { method, role });

export const trackDemoLogin = (role) =>
  track('Demo Login', { role });

export const trackTestStarted = (level) =>
  track('Test Started', { level });

export const trackTestCompleted = (level, score, passed, timeTakenMs) =>
  track('Test Completed', { level, score, passed, time_taken_ms: timeTakenMs });

export const trackTestAbandoned = (level, questionIndex) =>
  track('Test Abandoned', { level, question_index: questionIndex });

export const trackPracticeStarted = (exerciseType) =>
  track('Practice Started', { exercise_type: exerciseType });

export const trackPracticeCompleted = (exerciseType, score) =>
  track('Practice Completed', { exercise_type: exerciseType, score });

export const trackUpgradeModalViewed = (currentPlan, trigger) =>
  track('Upgrade Modal Viewed', { current_plan: currentPlan, trigger });

export const trackUpgradeInitiated = (planType, studentCount, totalInr) =>
  track('Upgrade Initiated', { plan_type: planType, student_count: studentCount, total_inr: totalInr });

export const trackUpgradeCompleted = (planType) =>
  track('Upgrade Completed', { plan_type: planType });

export const trackCMSAction = (action, entityType) =>
  track('CMS Action', { action, entity_type: entityType });

export const trackClassCreated = () =>
  track('Class Created');

export const trackStudentViewed = (studentId) =>
  track('Student Profile Viewed', { student_id: studentId });

export const trackPageView = (pageName) =>
  track('Page View', { page: pageName });
