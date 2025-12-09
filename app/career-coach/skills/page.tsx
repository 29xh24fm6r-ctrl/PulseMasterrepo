"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Lesson {
  title: string;
  objective: string;
  duration: string;
}

interface Curriculum {
  overview: string;
  lessons: Lesson[];
}

interface LessonContent {
  intro: string;
  concept: string;
  example: string;
  technique: { name: string; steps: string[] };
  tip: string;
  exercise: string;
  takeaway: string;
}

interface Evaluation {
  score: number;
  feedback: string;
  suggestion: string;
  encouragement: string;
}

export default function SkillBuildingPage() {
  const [jobModel, setJobModel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [exerciseResponse, setExerciseResponse] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadJobModel();
  }, []);

  async function loadJobModel() {
    try {
      const res = await fetch('/api/career/job-model');
      const data = await res.json();
      if (data.ok && data.jobModel) {
        setJobModel(data.jobModel);
      }
    } catch (error) {
      console.error('Failed to load job model:', error);
    } finally {
      setLoading(false);
    }
  }

  async function selectSkill(skill: string) {
    setSelectedSkill(skill);
    setCurriculum(null);
    setCurrentLessonIndex(null);
    setLessonContent(null);
    setEvaluation(null);
    setGenerating(true);

    try {
      const res = await fetch('/api/career/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'curriculum', skill, jobModel }),
      });
      const data = await res.json();
      if (data.ok) {
        setCurriculum(data.curriculum);
      }
    } catch (error) {
      console.error('Failed to generate curriculum:', error);
    } finally {
      setGenerating(false);
    }
  }

  async function startLesson(index: number) {
    setCurrentLessonIndex(index);
    setLessonContent(null);
    setEvaluation(null);
    setExerciseResponse('');
    setGenerating(true);

    try {
      const res = await fetch('/api/career/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lesson',
          skill: selectedSkill,
          lessonIndex: index,
          lessonTitle: curriculum?.lessons[index].title,
          jobModel,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setLessonContent(data.lesson);
      }
    } catch (error) {
      console.error('Failed to load lesson:', error);
    } finally {
      setGenerating(false);
    }
  }

  async function submitExercise() {
    if (!exerciseResponse.trim()) return;
    setGenerating(true);

    try {
      const res = await fetch('/api/career/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          skill: selectedSkill,
          exercise: lessonContent?.exercise,
          response: exerciseResponse,
          jobModel,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setEvaluation(data.evaluation);
        
        // Track completed lesson
        fetch('/api/career/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'lesson' }),
        }).catch(() => {}); // Fire and forget
      }
    } catch (error) {
      console.error('Failed to evaluate:', error);
    } finally {
      setGenerating(false);
    }
  }

  function nextLesson() {
    if (currentLessonIndex !== null && curriculum && currentLessonIndex < curriculum.lessons.length - 1) {
      startLesson(currentLessonIndex + 1);
    } else {
      // Finished all lessons
      setCurrentLessonIndex(null);
      setLessonContent(null);
      setEvaluation(null);
    }
  }

  function goBack() {
    if (evaluation) {
      setEvaluation(null);
    } else if (lessonContent) {
      setLessonContent(null);
      setCurrentLessonIndex(null);
    } else if (curriculum) {
      setCurriculum(null);
      setSelectedSkill(null);
    }
  }

  const allSkills = [...(jobModel?.coreSkills || []), ...(jobModel?.customSkills || [])];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Skill Selection
  if (!selectedSkill) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link href="/career-coach" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-white font-semibold">📚 Skill Building</h1>
              <p className="text-xs text-zinc-500">Choose a skill to develop</p>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6">
          {allSkills.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📚</div>
              <h2 className="text-xl font-semibold text-white mb-2">No Skills Found</h2>
              <p className="text-zinc-400 mb-4">Complete your profile setup to get personalized skill lessons.</p>
              <Link href="/career-coach" className="text-emerald-400 hover:text-emerald-300">
                ← Back to Career Coach
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {allSkills.map((skill, i) => (
                <button
                  key={i}
                  onClick={() => selectSkill(skill)}
                  className="w-full text-left p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-emerald-500/50 transition-all flex items-center gap-4 group"
                >
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 text-lg">
                    📖
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors">{skill}</h3>
                    <p className="text-sm text-zinc-500">5 micro-lessons</p>
                  </div>
                  <svg className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Curriculum Overview
  if (curriculum && currentLessonIndex === null) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={goBack} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-white font-semibold">{selectedSkill}</h1>
              <p className="text-xs text-zinc-500">5-lesson curriculum</p>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-emerald-300">{curriculum.overview}</p>
          </div>
          
          <div className="space-y-3">
            {curriculum.lessons.map((lesson, i) => (
              <button
                key={i}
                onClick={() => startLesson(i)}
                className="w-full text-left p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-emerald-500/50 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-medium flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors">{lesson.title}</h3>
                    <p className="text-sm text-zinc-500">{lesson.objective}</p>
                    <p className="text-xs text-zinc-600 mt-1">{lesson.duration}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Loading state
  if (generating) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-zinc-400">
            {!curriculum ? 'Creating your curriculum...' : 
             !lessonContent ? 'Preparing your lesson...' : 
             'Evaluating your response...'}
          </p>
        </div>
      </div>
    );
  }

  // Lesson Content
  if (lessonContent && !evaluation) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={goBack} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-white font-semibold text-sm">Lesson {(currentLessonIndex || 0) + 1}: {curriculum?.lessons[currentLessonIndex!]?.title}</h1>
              <p className="text-xs text-zinc-500">{selectedSkill}</p>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <p className="text-zinc-300">{lessonContent.intro}</p>
          
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <h3 className="text-emerald-400 font-medium mb-2">💡 Key Concept</h3>
            <p className="text-zinc-300">{lessonContent.concept}</p>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-zinc-400 font-medium mb-2">📖 Example</h3>
            <p className="text-zinc-300">{lessonContent.example}</p>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-cyan-400 font-medium mb-2">🔧 {lessonContent.technique.name}</h3>
            <ol className="list-decimal list-inside space-y-2">
              {lessonContent.technique.steps.map((step, i) => (
                <li key={i} className="text-zinc-300">{step}</li>
              ))}
            </ol>
          </div>
          
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <h3 className="text-amber-400 font-medium mb-2">💎 Pro Tip</h3>
            <p className="text-zinc-300">{lessonContent.tip}</p>
          </div>
          
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
            <h3 className="text-violet-400 font-medium mb-2">✍️ Practice Exercise</h3>
            <p className="text-zinc-300 mb-4">{lessonContent.exercise}</p>
            <textarea
              value={exerciseResponse}
              onChange={(e) => setExerciseResponse(e.target.value)}
              placeholder="Write your response here..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 min-h-[120px]"
            />
            <button
              onClick={submitExercise}
              disabled={!exerciseResponse.trim()}
              className="mt-3 w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white rounded-xl font-medium"
            >
              Submit & Get Feedback →
            </button>
          </div>
          
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
            <h3 className="text-zinc-400 font-medium mb-2">🎯 Key Takeaway</h3>
            <p className="text-zinc-300">{lessonContent.takeaway}</p>
          </div>
        </main>
      </div>
    );
  }

  // Evaluation
  if (evaluation) {
    const scoreEmoji = evaluation.score >= 8 ? '🌟' : evaluation.score >= 6 ? '👍' : '💪';
    
    return (
      <div className="min-h-screen bg-zinc-950">
        <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={goBack} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h1 className="text-white font-semibold">Exercise Feedback</h1>
              <p className="text-xs text-zinc-500">Lesson {(currentLessonIndex || 0) + 1} complete!</p>
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div className="text-center py-6">
            <div className="text-6xl mb-4">{scoreEmoji}</div>
            <div className="text-4xl font-bold text-white mb-2">{evaluation.score}/10</div>
          </div>
          
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <h3 className="text-emerald-400 font-medium mb-2">Feedback</h3>
            <p className="text-zinc-300">{evaluation.feedback}</p>
          </div>
          
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <h3 className="text-amber-400 font-medium mb-2">Suggestion</h3>
            <p className="text-zinc-300">{evaluation.suggestion}</p>
          </div>
          
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4">
            <p className="text-violet-300 italic">{evaluation.encouragement}</p>
          </div>
          
          <div className="flex gap-3">
            {currentLessonIndex !== null && curriculum && currentLessonIndex < curriculum.lessons.length - 1 ? (
              <button
                onClick={nextLesson}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium"
              >
                Next Lesson →
              </button>
            ) : (
              <button
                onClick={() => { setSelectedSkill(null); setCurriculum(null); setCurrentLessonIndex(null); setLessonContent(null); setEvaluation(null); }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium"
              >
                🎉 Course Complete! Choose Another Skill
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  return null;
}
