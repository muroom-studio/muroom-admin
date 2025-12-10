'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// --- Type Definitions (API 응답 구조 매핑) ---

interface TermCode {
    description: string;
    required: boolean;
    code: string;
}

interface TermTargetRole {
    description: string;
    code: string;
}

interface TermItem {
    termId: number;
    code: TermCode;
    targetRole: TermTargetRole;
    version: string;
    isMandatory: boolean;
    effectiveAt: string; // ISO 8601 Date String
}

interface TermsResponse {
    status: number;
    message: string;
    data: TermItem[];
}

// --- Helper Functions ---

// 날짜 포맷팅 (YYYY.MM.DD HH:mm)
const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

export default function MusicianSignupTermsPage() {
    const [terms, setTerms] = useState<TermItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

    useEffect(() => {
        const fetchTerms = async () => {
            try {
                // [API 호출] 뮤지션 회원가입 약관 조회
                const res = await fetch(`${API_BASE_URL}/api/v1/terms/musician/signup`);

                if (!res.ok) {
                    throw new Error('약관 목록을 불러오지 못했습니다.');
                }

                const responseBody: TermsResponse = await res.json();

                if (Array.isArray(responseBody.data)) {
                    setTerms(responseBody.data);
                } else {
                    setTerms([]);
                }
            } catch (error) {
                console.error(error);
                alert('데이터 로딩 중 오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTerms();
    }, [API_BASE_URL]);

    return (
        <div className='min-h-screen bg-gray-50 p-8'>
            <div className='max-w-6xl mx-auto'>
                {/* 헤더 */}
                <div className='flex justify-between items-center mb-6'>
                    <div>
                        <h1 className='text-2xl font-bold text-gray-800'>뮤지션 회원가입 약관 관리</h1>
                        <p className='text-sm text-gray-500 mt-1'>회원가입 시 노출되는 뮤지션용 약관 목록입니다.</p>
                    </div>
                    {/* 필요 시 약관 등록 버튼 추가 */}
                    <Link
                        href='/terms/new'
                        className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors text-sm'
                    >
                        + 새 약관 등록
                    </Link>
                </div>

                {/* 테이블 영역 */}
                <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
                    {isLoading ? (
                        <div className='flex justify-center items-center h-40 text-gray-500'>로딩 중...</div>
                    ) : terms.length === 0 ? (
                        <div className='flex justify-center items-center h-40 text-gray-400'>
                            등록된 회원가입 약관이 없습니다.
                        </div>
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='w-full text-left border-collapse'>
                                <thead>
                                    <tr className='bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider'>
                                        <th className='px-6 py-3 font-semibold w-20'>ID</th>
                                        <th className='px-6 py-3 font-semibold'>약관 유형</th>
                                        <th className='px-6 py-3 font-semibold w-32'>필수 여부</th>
                                        <th className='px-6 py-3 font-semibold w-24'>버전</th>
                                        <th className='px-6 py-3 font-semibold'>대상</th>
                                        <th className='px-6 py-3 font-semibold'>시행 일시</th>
                                        <th className='px-6 py-3 font-semibold text-center w-24'>관리</th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-gray-100'>
                                    {terms.map((term) => (
                                        <tr key={term.termId} className='hover:bg-gray-50 transition-colors'>
                                            <td className='px-6 py-4 text-gray-500 text-sm'>{term.termId}</td>
                                            <td className='px-6 py-4'>
                                                <div className='flex flex-col'>
                                                    <span className='font-bold text-gray-800'>
                                                        {term.code.description}
                                                    </span>
                                                    <span className='text-xs text-gray-400 mt-0.5'>
                                                        {term.code.code}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className='px-6 py-4'>
                                                {term.isMandatory ? (
                                                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
                                                        필수
                                                    </span>
                                                ) : (
                                                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
                                                        선택
                                                    </span>
                                                )}
                                            </td>
                                            <td className='px-6 py-4 text-sm text-gray-700'>
                                                <span className='bg-gray-100 px-2 py-1 rounded text-xs font-semibold text-gray-600'>
                                                    v{term.version}
                                                </span>
                                            </td>
                                            <td className='px-6 py-4 text-sm text-gray-600'>
                                                {term.targetRole.description} ({term.targetRole.code})
                                            </td>
                                            <td className='px-6 py-4 text-sm text-gray-600 whitespace-nowrap'>
                                                {formatDate(term.effectiveAt)}
                                            </td>
                                            <td className='px-6 py-4 text-center'>
                                                <Link
                                                    href={`/terms/${term.termId}`}
                                                    className='text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline'
                                                >
                                                    상세보기
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
