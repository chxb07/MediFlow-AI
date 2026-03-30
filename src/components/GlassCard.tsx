import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  glow?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow, children, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        'glass rounded-xl p-6',
        glow && 'animate-pulse-glow',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      {...props}
    >
      {children}
    </motion.div>
  )
);

GlassCard.displayName = 'GlassCard';
export default GlassCard;
