'use client';

import Link from 'next/link';

export default function Home() {
    return (
        <div className='flex flex-col min-h-screen items-center justify-center p-8'>
            redirecting to muroom admin
            <Link href='/studios' className='mt-4 text-blue-500 underline'>
                STUDIOS
            </Link>
            <Link href='/terms' className='mt-2 text-blue-500 underline'>
                TERMS
            </Link>
        </div>
    );
}
