// POST /api/dashboard/interview/answer
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { INTERVIEW_QUESTIONS, TOTAL_QUESTIONS } from "@/lib/dashboard/interviewQuestions";



export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdminRuntimeClient();
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId, questionId, answer } = await req.json();

    const { data: session } = await supabase
      .from("user_interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (session.is_complete) return NextResponse.json({ error: "Already complete" }, { status: 400 });

    // Update answers
    const currentAnswers = session.answers || [];
    const updatedAnswers = [
      ...currentAnswers.filter((a: any) => a.questionId !== questionId),
      { questionId, answer },
    ];

    const nextIndex = session.current_question_index + 1;
    const isComplete = nextIndex >= TOTAL_QUESTIONS;

    await supabase
      .from("user_interview_sessions")
      .update({
        current_question_index: nextIndex,
        is_complete: isComplete,
        answers: updatedAnswers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (isComplete) {
      return NextResponse.json({ isComplete: true });
    }

    return NextResponse.json({
      isComplete: false,
      currentQuestionIndex: nextIndex,
      totalQuestions: TOTAL_QUESTIONS,
      question: INTERVIEW_QUESTIONS[nextIndex],
      progress: Math.round((nextIndex / TOTAL_QUESTIONS) * 100),
    });
  } catch (error) {
    console.error("[Interview Answer]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
