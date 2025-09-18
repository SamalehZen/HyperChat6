import { cn } from '@repo/ui';
import { Skeleton } from '@repo/ui';

export const MotionSkeleton = ({ className }: { className?: string }) => {
    return (
        <div className="w-full transition-all duration-500">
            <Skeleton
                className={cn(
                    'from-muted-foreground/90 via-muted-foreground/60 to-muted-foreground/10 h-5 w-full rounded-sm bg-gradient-to-r',
                    className
                )}
            />
        </div>
    );
};
