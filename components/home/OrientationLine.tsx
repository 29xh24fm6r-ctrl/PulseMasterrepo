"use client";

interface OrientationLineProps {
    message: string;
}

export function OrientationLine({ message }: OrientationLineProps) {
    return (
        <div className="mb-12 text-center px-4">
            <p className="text-xl md:text-2xl font-light text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {message}
            </p>
        </div>
    );
}
