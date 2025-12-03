'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
    const router = useRouter();

    return (
        <div className='flex flex-col min-h-screen items-center justify-center p-8'>
            <button className='rounded px-4 py-2 border' onClick={() => router.push('/owners/new')}>
                + OWNER
            </button>
            <br />
            <button className='rounded px-4 py-2 border' onClick={() => router.push('/studios/new')}>
                + STUDIO
            </button>
        </div>
    );
}
