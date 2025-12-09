import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Transcribe audio to text using Whisper
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;

    // Speech-to-Text
    if (action === 'transcribe') {
      const audioBlob = formData.get('audio') as Blob;
      
      if (!audioBlob) {
        return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
      }

      // Convert blob to file for OpenAI
      const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
      const audioFile = await toFile(audioBuffer, 'audio.webm', { type: 'audio/webm' });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
      });

      return NextResponse.json({ 
        text: transcription.text,
        success: true 
      });
    }

    // Text-to-Speech
    if (action === 'speak') {
      const text = formData.get('text') as string;
      
      if (!text) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 });
      }

      // Generate speech using OpenAI TTS
      const mp3Response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova', // Warm, friendly voice - options: alloy, echo, fable, onyx, nova, shimmer
        input: text,
        speed: 1.0,
      });

      // Convert to buffer and send as audio
      const audioBuffer = Buffer.from(await mp3Response.arrayBuffer());
      
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Voice API error:', error);
    return NextResponse.json(
      { error: 'Voice processing failed', details: String(error) },
      { status: 500 }
    );
  }
}