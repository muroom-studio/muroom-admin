'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewOwnerPage() {
    const router = useRouter();
    const [nickname, setNickname] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 환경 변수 (이전 코드와 동일한 로직)
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

    // 1. 닉네임 생성 요청 핸들러
    const handleGenerateNickname = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/admin/owners/generate-nickname`);

            if (!res.ok) {
                throw new Error('닉네임 생성에 실패했습니다.');
            }

            const responseBody = await res.json();
            // 응답 구조: { status: 200, message: "...", data: "친절한 뮤즈 152593" }
            if (responseBody.data) {
                setNickname(responseBody.data);
            }
        } catch (error) {
            console.error(error);
            alert('닉네임을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 2. 소유주 등록 요청 핸들러
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nickname) return alert('닉네임을 생성해주세요.');
        if (!phoneNumber) return alert('전화번호를 입력해주세요.');

        try {
            setIsLoading(true);

            const payload = {
                nickname: nickname,
                phoneNumber: phoneNumber.replace(/-/g, ''), // 하이픈 제거 (선택사항)
            };

            const res = await fetch(`${API_BASE_URL}/api/admin/owners`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${token}` // 필요 시 토큰 추가
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || '등록 실패');
            }

            alert('소유주가 성공적으로 등록되었습니다.');

            // 등록 후 초기화 (또는 페이지 이동)
            setNickname('');
            setPhoneNumber('');
        } catch (error) {
            console.error(error);
            alert('소유주 등록 중 오류가 발생했습니다.' + (error instanceof Error ? `\n${error.message}` : ''));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='flex flex-col min-h-screen items-center justify-center p-8 bg-gray-50'>
            <main className='w-full max-w-md bg-white p-8 rounded-lg shadow-md'>
                <h1 className='text-2xl font-bold mb-8 text-center'>소유주 등록</h1>

                <form onSubmit={handleSubmit} className='space-y-6'>
                    {/* 닉네임 입력 섹션 */}
                    <div>
                        <label htmlFor='nickname' className='block mb-2 font-medium text-gray-700'>
                            닉네임
                        </label>
                        <div className='flex gap-2'>
                            <input
                                type='text'
                                id='nickname'
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder='닉네임을 생성해주세요'
                                className='w-full border p-2 rounded-md bg-gray-100'
                                readOnly // 생성된 닉네임은 수정 불가하게 하려면 true
                            />
                            <button
                                type='button'
                                onClick={handleGenerateNickname}
                                disabled={isLoading}
                                className='bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 whitespace-nowrap text-sm'
                            >
                                {isLoading ? '...' : '생성'}
                            </button>
                        </div>
                        <p className='text-xs text-gray-500 mt-1'>* 버튼을 누르면 랜덤 닉네임이 자동 생성됩니다.</p>
                    </div>

                    {/* 전화번호 입력 섹션 */}
                    <div>
                        <label htmlFor='phoneNumber' className='block mb-2 font-medium text-gray-700'>
                            전화번호
                        </label>
                        <input
                            type='text'
                            id='phoneNumber'
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder='01012345678'
                            className='w-full border p-2 rounded-md'
                            required
                        />
                    </div>

                    {/* 제출 버튼 */}
                    <button
                        type='submit'
                        disabled={isLoading}
                        className={`w-full text-white p-3 rounded-md font-bold transition-colors ${
                            isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isLoading ? '처리 중...' : '소유주 등록'}
                    </button>
                </form>
            </main>
            <button
                type='button'
                onClick={() => router.push('/')}
                className='mt-4 text-gray-700 p-3 rounded-md font-bold border border-gray-300 hover:bg-gray-100 transition-colors'
            >
                홈으로 돌아가기
            </button>
        </div>
    );
}
