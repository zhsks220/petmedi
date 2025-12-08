'use client';

import { cn } from '@/lib/utils';
import { Bell, HelpCircle } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: any;
    children?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, description, icon: Icon, children, className }: PageHeaderProps) {
    return (
        <header className={cn("flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4", className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm">
                            <Icon className="h-4 w-4 text-slate-600" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
                        {description && (
                            <p className="text-sm text-slate-500">{description}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {children}
                    {/* Default actions */}
                    <div className="h-6 w-[1px] bg-slate-200 mx-2" />
                    <button className="text-slate-400 hover:text-slate-600 transition-colors">
                        <HelpCircle className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>
    );
}
