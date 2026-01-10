
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export function useCyrano() {
    const [callStatus, setCallStatus] = useState<'idle' | 'in-progress'>('idle');
    const [lastTranscript, setLastTranscript] = useState<string>('');

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase.channel('realtime-calls')
            .on('broadcast', { event: 'transcript' }, (payload) => {
                console.log('Cyrano Whisper:', payload);
                const text = payload.payload.text;
                setLastTranscript(text);
                setCallStatus('in-progress');
                
                // Visual Whisper
                toast.message("Cyrano", {
                    description: text,
                    duration: 4000,
                    icon: "🧠"
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { callStatus, lastTranscript };
}
