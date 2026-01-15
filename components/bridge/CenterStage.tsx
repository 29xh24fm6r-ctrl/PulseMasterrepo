import React from 'react';

export default function CenterStage({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex-1 flex flex-col items-center justify-start pt-16 sm:pt-24 lg:pt-32 min-h-[50vh] center-stage">
            <div className="w-full max-w-2xl mx-auto transition-all duration-500 ease-out">
                {children}
            </div>

            {/* MicroFeedbackLayer placeholder - animations/toast could go here */}
            <div id="bridge-micro-feedback" className="fixed bottom-8 right-8 z-50 pointer-events-none" />
        </main>
    );
}
