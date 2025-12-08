'use client';

import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MotionProps extends HTMLMotionProps<'div'> {
    children: ReactNode;
    className?: string;
    delay?: number;
}

export function FadeIn({ children, className, delay = 0, ...props }: MotionProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay, ease: 'easeOut' }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export function SlideUp({ children, className, delay = 0, ...props }: MotionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export function ScaleIn({ children, className, delay = 0, ...props }: MotionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export function StaggerContainer({ children, className, delay = 0, ...props }: MotionProps) {
    return (
        <motion.div
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
                hidden: { opacity: 0 },
                show: {
                    opacity: 1,
                    transition: {
                        staggerChildren: 0.1,
                        delayChildren: delay,
                    },
                },
            }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
