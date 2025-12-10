'use client';

import Link from 'next/link';

export default function Home() {
    return (
        <div className='flex flex-col min-h-screen items-center justify-center p-8'>
            <h1 className='text-3xl font-bold mb-6'>MUROOM ADMIN DASHBOARD</h1>
            <Link href='/studios' className='mt-4 text-blue-500 underline'>
                STUDIOS
            </Link>
            <Link href='/terms/musician/signup' className='mt-2 text-blue-500 underline'>
                MUSICIAN SIGNUP TERMS
            </Link>
        </div>
    );
}
