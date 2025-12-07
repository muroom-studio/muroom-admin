'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        router.push('/studios');
    }, [router]);

    return (
        <div className='flex flex-col min-h-screen items-center justify-center p-8'>redirecting to muroom admin</div>
    );
}
