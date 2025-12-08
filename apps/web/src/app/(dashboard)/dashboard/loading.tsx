import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

export default function DashboardLoading() {
    return (
        <div className="flex h-full w-full items-center justify-center p-6">
            <Card className="w-full max-w-md">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">데이터를 불러오는 중입니다...</p>
                </CardContent>
            </Card>
        </div>
    );
}
