'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import 'suneditor/dist/css/suneditor.min.css'; // SunEditor 스타일

// --- Type Definitions ---
interface TermContentDto {
    termId: number;
    title: string; // [추가] 제목 필드
    content: string; // HTML String
}

interface TermDetailResponse {
    status: number;
    message: string;
    data: TermContentDto;
}

export default function TermsDetailPage() {
    const params = useParams();
    const router = useRouter();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

    const [term, setTerm] = useState<TermContentDto | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTermDetail = async () => {
            if (!params.id) return;

            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/terms/${params.id}`);

                if (!res.ok) {
                    throw new Error('약관 상세 정보를 불러오는데 실패했습니다.');
                }

                const responseBody: TermDetailResponse = await res.json();
                setTerm(responseBody.data);
            } catch (error) {
                console.error(error);
                alert('데이터 로딩 실패');
                router.back();
            } finally {
                setIsLoading(false);
            }
        };

        fetchTermDetail();
    }, [params.id, API_BASE_URL, router]);

    if (isLoading) {
        return (
            <div className='flex justify-center items-center h-screen bg-gray-50'>
                <div className='text-lg text-gray-500'>로딩 중...</div>
            </div>
        );
    }

    if (!term) {
        return (
            <div className='flex justify-center items-center h-screen bg-gray-50'>
                <div className='text-lg text-red-500'>데이터가 없습니다.</div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gray-50 p-8 flex flex-col items-center'>
            <main className='w-full max-w-5xl bg-white rounded-xl shadow-sm border border-gray-100 p-8'>
                {/* 헤더 (제목 표시) */}
                <div className='flex justify-between items-start mb-6 border-b pb-4'>
                    <div className='flex-1 pr-4'>
                        {/* [수정] 제목 표시 */}
                        <h1 className='text-2xl font-bold text-gray-900 mb-1'>{term.title}</h1>
                        <p className='text-sm text-gray-500'>ID: {term.termId}</p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className='bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors whitespace-nowrap'
                    >
                        뒤로가기
                    </button>
                </div>

                {/* 본문 내용 (HTML 렌더링) */}
                <div className='bg-white border border-gray-200 rounded-lg min-h-[500px] p-6 mb-8'>
                    {/* sun-editor-editable 클래스 사용 */}
                    <div
                        className='sun-editor-editable'
                        dangerouslySetInnerHTML={{ __html: term.content }}
                        style={{ fontFamily: 'inherit', border: 'none', padding: 0 }}
                    />
                </div>

                {/* 하단 버튼 */}
                <div className='mt-8 flex justify-end gap-3'>
                    <button
                        onClick={() => router.push('/terms/musician/signup')}
                        className='px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors'
                    >
                        목록으로
                    </button>
                    {/* <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">수정하기</button> */}
                </div>
            </main>
        </div>
    );
}
