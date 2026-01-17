// POST /api/dashboard/interview/start
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { INTERVIEW_QUESTIONS, TOTAL_QUESTIONS } from "@/lib/dashboard/interviewQuestions";



export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdminRuntimeClient();
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check for existing incomplete session
    const { data: existing } = await supabase
      .from("user_interview_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_complete", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let session = existing;

    if (!session) {
      const { data: newSession, error } = await supabase
        .from("user_interview_sessions")
        .insert({
          user_id: userId,
          current_question_index: 0,
          is_complete: false,
          answers: [],
        })
        .select()
        .single();

      if (error) throw error;
      session = newSession;
    }

    const currentQuestion = INTERVIEW_QUESTIONS[session.current_question_index];

    return NextResponse.json({
      sessionId: session.id,
      currentQuestionIndex: session.current_question_index,
      totalQuestions: TOTAL_QUESTIONS,
      question: currentQuestion,
      isComplete: session.is_complete,
    });
  } catch (error) {
    console.error("[Interview Start]", error);
    return NextResponse.json({ error: "Failed to start" }, { status: 500 });
  }
}
