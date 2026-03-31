import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  glow?: boolean;
  variant?: 'default' | 'elevated' | 'flat';
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow, variant = 'default', children, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        'glass-card rounded-2xl p-6',
        glow && 'animate-pulse-glow',
        variant === 'elevated' && 'shadow-xl',
        variant === 'flat' && 'hover:transform-none hover:shadow-none',
        className
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  )
);

GlassCard.displayName = 'GlassCard';
export default GlassCard;
