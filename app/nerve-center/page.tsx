import React from 'react';
import { NerveCenterCanvas } from '@/components/nerve-center/NerveCenterCanvas';

export const metadata = {
    title: 'Pulse Nerve Center',
    description: 'Graphical System Control Surface v1',
};

export default function NerveCenterPage() {
    return (
        <main className="w-full h-screen overflow-hidden bg-black">
            <NerveCenterCanvas />
        </main>
    );
}
