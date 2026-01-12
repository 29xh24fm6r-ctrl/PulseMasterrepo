// "Extreme Liquid Glassmorphism"
// "High Gaussian blur", "Variable opacity", "Inner light gradients", "Edge refraction", "Layered shadows"

export const GlassMaterials = {
    // The base material for all glass elements
    base: `
    backdrop-blur-3xl
    bg-white/5 
    border border-white/10
    shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]
    rounded-[3rem]
    relative
    overflow-hidden
  `, // Using tailwind arbitrary values for shadow to match spec preciseness if needed, but standard might suffice. Spec asks for "Layered shadows".

    // Inner light / refraction effect (can be an absolute overlay or pseudo-element in usage)
    innerLight: `
    absolute inset-0
    bg-gradient-to-br from-white/20 via-transparent to-transparent
    pointer-events-none
  `,

    // Specific Zone Glass styling
    zone: `
    transition-all duration-700 ease-in-out
    hover:bg-white/10
    hover:border-white/20
    hover:shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]
    group
  `,

    // The Core's extremely intense glass
    core: `
    backdrop-blur-[100px]
    bg-white/5
    shadow-[0_0_100px_rgba(0,0,0,0.5)]
    border border-white/5
  `
};
