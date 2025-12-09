'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// [수정 1] TermsCode 타입을 객체 형태로 변경
interface TermsCodeObj {
    code: string;
    description: string;
    required: boolean;
}

// [수정 2] API 응답 객체의 code 타입을 위에서 만든 객체 타입으로 변경
interface TermItem {
    termId: number;
    code: TermsCodeObj; // 여기가 핵심 변경 사항
    targetRole: 'OWNER' | 'MUSICIAN'; // TargetRole도 @JsonFormat이면 객체일 수 있음 (확인 필요)
    version: string;
    isMandatory: boolean;
    effectiveAt: string;
}

interface TermsResponse {
    status: number;
    message: string;
    data: TermItem[];
}

// [삭제] TERMS_CODE_MAP은 이제 필요 없음 (서버가 description을 줌)

const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function TermsListPage() {
    const [terms, setTerms] = useState<TermItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchTerms = useCallback(async () => {
        setIsLoading(true);
        try {
            // [참고] TermsType 파라미터는 API 요구사항에 맞춰 넣으세요
            // 예: ?types=TERMS_OF_USE,PRIVACY_COLLECTION...
            // 여기선 전체 조회라고 가정하고 엔드포인트 유지
            const res = await fetch(
                `/api/v1/terms/musician?types=TERMS_OF_USE,PRIVACY_COLLECTION,PRIVACY_PROCESSING,MARKETING_RECEIVE`
            );

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
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTerms();
    }, [fetchTerms]);

    return (
        <div className='min-h-screen bg-gray-50 p-8'>
            <div className='max-w-6xl mx-auto'>
                <div className='flex justify-between items-center mb-6'>
                    <div>
                        <h1 className='text-2xl font-bold text-gray-800'>뮤지션 약관 목록</h1>
                        <p className='text-sm text-gray-500 mt-1'>등록된 뮤지션용 약관 리스트입니다.</p>
                    </div>
                    <Link
                        href='/terms/new'
                        className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium transition-colors'
                    >
                        + 약관 등록
                    </Link>
                </div>

                <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
                    {isLoading ? (
                        <div className='flex justify-center items-center h-40'>
                            <span className='text-gray-500'>로딩 중...</span>
                        </div>
                    ) : terms.length === 0 ? (
                        <div className='flex justify-center items-center h-40'>
                            <span className='text-gray-400'>등록된 약관이 없습니다.</span>
                        </div>
                    ) : (
                        <div className='overflow-x-auto'>
                            <table className='w-full text-left border-collapse'>
                                <thead>
                                    <tr className='bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider'>
                                        <th className='px-6 py-3 font-semibold w-20'>ID</th>
                                        <th className='px-6 py-3 font-semibold'>구분</th>
                                        <th className='px-6 py-3 font-semibold w-24'>버전</th>
                                        <th className='px-6 py-3 font-semibold w-24'>필수 여부</th>
                                        <th className='px-6 py-3 font-semibold'>시행 일시</th>
                                        <th className='px-6 py-3 font-semibold text-center w-24'>관리</th>
                                    </tr>
                                </thead>
                                <tbody className='divide-y divide-gray-100'>
                                    {terms.map((term) => (
                                        <tr key={term.termId} className='hover:bg-gray-50 transition-colors'>
                                            <td className='px-6 py-4 text-gray-500 text-sm'>{term.termId}</td>
                                            <td className='px-6 py-4'>
                                                {/* [수정 3] 객체 통째로 렌더링하던 것을 -> 속성값 렌더링으로 변경 */}
                                                <span className='font-medium text-gray-800 block'>
                                                    {term.code.description}
                                                </span>
                                                <span className='text-xs text-gray-400'>{term.code.code}</span>
                                            </td>
                                            <td className='px-6 py-4 text-sm text-gray-700'>
                                                <span className='bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600'>
                                                    v{term.version}
                                                </span>
                                            </td>
                                            <td className='px-6 py-4'>
                                                {term.isMandatory ? (
                                                    <span className='text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold'>
                                                        필수
                                                    </span>
                                                ) : (
                                                    <span className='text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-bold'>
                                                        선택
                                                    </span>
                                                )}
                                            </td>
                                            <td className='px-6 py-4 text-sm text-gray-600'>
                                                {formatDate(term.effectiveAt)}
                                            </td>
                                            <td className='px-6 py-4 text-center'>
                                                <button
                                                    type='button'
                                                    onClick={() => {
                                                        router.push(`/terms/${term.termId}`);
                                                    }}
                                                    className='text-gray-400 hover:text-blue-600 text-sm underline'
                                                >
                                                    상세
                                                </button>
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
