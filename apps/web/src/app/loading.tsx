import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">
                    로딩 중...
                </p>
            </div>
        </div>
    );
}
