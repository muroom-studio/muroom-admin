'use client';

import { useState } from 'react';

interface OwnerRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (phoneNumber: string) => void; // 등록 성공 시 부모에게 전화번호 전달
}

export default function OwnerRegisterModal({ isOpen, onClose, onSuccess }: OwnerRegisterModalProps) {
    const [nickname, setNickname] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // 1. 닉네임 생성 (모달 열릴 때 자동 호출하거나, 버튼으로 호출)
    const handleGenerateNickname = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/admin/owners/generate-nickname');
            if (!res.ok) throw new Error('닉네임 생성 실패');
            const response = await res.json();
            // 응답 구조가 { data: "랜덤닉네임" } 이라고 가정
            setNickname(response.data);
        } catch (error) {
            alert('닉네임 생성 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 2. 사장님 등록
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname) return alert('닉네임을 먼저 생성해주세요.');
        if (!phoneNumber) return alert('전화번호를 입력해주세요.');

        try {
            setIsLoading(true);
            const res = await fetch('/api/admin/owners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname, phoneNumber }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }

            alert('사장님이 등록되었습니다.');
            onSuccess(phoneNumber); // 부모 컴포넌트에 전화번호 전달
            handleClose(); // 초기화 및 닫기
        } catch (error) {
            alert('등록 실패: ' + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setNickname('');
        setPhoneNumber('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
            <div className='bg-white rounded-lg shadow-lg w-full max-w-md p-6'>
                <div className='flex justify-between items-center mb-4'>
                    <h2 className='text-xl font-bold'>사장님 신규 등록</h2>
                    <button onClick={handleClose} className='text-gray-500 hover:text-gray-700'>
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className='space-y-4'>
                    {/* 닉네임 섹션 */}
                    <div>
                        <label className='block mb-1 font-medium text-sm text-gray-700'>닉네임 (자동 생성)</label>
                        <div className='flex gap-2'>
                            <input
                                type='text'
                                value={nickname}
                                readOnly
                                placeholder='버튼을 눌러주세요'
                                className='flex-1 border p-2 rounded-md bg-gray-100 text-gray-600'
                            />
                            <button
                                type='button'
                                onClick={handleGenerateNickname}
                                disabled={isLoading}
                                className='bg-gray-600 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-700 shrink-0'
                            >
                                닉네임 생성
                            </button>
                        </div>
                    </div>

                    {/* 전화번호 섹션 */}
                    <div>
                        <label className='block mb-1 font-medium text-sm text-gray-700'>전화번호</label>
                        <input
                            type='text'
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder='01012345678'
                            className='w-full border p-2 rounded-md'
                            required
                        />
                    </div>

                    <div className='flex justify-end gap-2 mt-6'>
                        <button
                            type='button'
                            onClick={handleClose}
                            className='px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50'
                        >
                            취소
                        </button>
                        <button
                            type='submit'
                            disabled={isLoading}
                            className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
                        >
                            {isLoading ? '등록 중...' : '등록하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
