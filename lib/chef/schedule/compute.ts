export function computeStartCookAt(args: {
    target_eat_at: Date;
    prep_minutes: number;
    cook_minutes: number;
    buffer_minutes: number;
    user_speed_modifier: number; // 1.0 baseline
}): Date {
    const total = Math.round(((args.prep_minutes + args.cook_minutes) * args.user_speed_modifier) + args.buffer_minutes);
    return new Date(args.target_eat_at.getTime() - total * 60 * 1000);
}
