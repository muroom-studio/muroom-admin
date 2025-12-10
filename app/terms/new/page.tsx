'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TextEditor from '@/components/TextEditor';
import 'suneditor/dist/css/suneditor.min.css'; // SunEditor 스타일

// --- Type Definitions ---

type TermsType = 'TERMS_OF_USE' | 'PRIVACY_COLLECTION' | 'PRIVACY_PROCESSING' | 'MARKETING_RECEIVE';
type TargetRole = 'OWNER' | 'MUSICIAN';

const TERMS_TYPE_OPTIONS: { label: string; value: TermsType }[] = [
    { label: '이용약관', value: 'TERMS_OF_USE' },
    { label: '개인정보 수집', value: 'PRIVACY_COLLECTION' },
    { label: '개인정보 처리', value: 'PRIVACY_PROCESSING' },
    { label: '마케팅 수신', value: 'MARKETING_RECEIVE' },
];

const TARGET_ROLE_OPTIONS: { label: string; value: TargetRole }[] = [
    { label: '사장님 (OWNER)', value: 'OWNER' },
    { label: '뮤지션 (MUSICIAN)', value: 'MUSICIAN' },
];

export default function TermsCreatePage() {
    const router = useRouter();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Form States ---
    const [code, setCode] = useState<TermsType | ''>('');
    const [targetRole, setTargetRole] = useState<TargetRole | ''>('');
    const [isMandatory, setIsMandatory] = useState<boolean>(true);

    // [추가] 제목 State
    const [title, setTitle] = useState('');

    const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [effectiveTime, setEffectiveTime] = useState('00:00');

    const [content, setContent] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 유효성 검사
        if (!code) return alert('약관 유형을 선택해주세요.');
        if (!targetRole) return alert('대상 역할을 선택해주세요.');
        if (!title.trim()) return alert('제목을 입력해주세요.'); // [추가] 제목 검사
        if (!effectiveDate || !effectiveTime) return alert('시행일시를 입력해주세요.');

        // 에디터 빈 내용 검사
        if (!content.replace(/<[^>]*>/g, '').trim()) return alert('약관 내용을 입력해주세요.');

        if (!confirm('약관을 등록하시겠습니까?')) return;

        setIsSubmitting(true);

        try {
            const dateTimeString = `${effectiveDate}T${effectiveTime}:00`;
            const localDate = new Date(dateTimeString);
            const isoString = localDate.toISOString();

            // Payload 구성 (title 추가)
            const payload = {
                code,
                targetRole,
                isMandatory,
                title, // [추가]
                effectiveAt: isoString,
                content,
            };

            const res = await fetch(`/api/v1/terms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }

            alert('약관이 등록되었습니다.');
            // 약관 목록 페이지로 이동 (뮤지션/사장님 구분 없이 통합 목록이라면 /admin/terms 등 사용)
            router.push('/terms/musician/signup');
        } catch (error) {
            console.error(error);
            alert('등록 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='min-h-screen bg-gray-50 p-8 flex flex-col items-center'>
            <main className='w-full max-w-7xl bg-white rounded-xl shadow-sm border border-gray-100 p-8'>
                <div className='flex justify-between items-center mb-8 border-b pb-4'>
                    <h1 className='text-2xl font-bold text-gray-800'>약관 등록</h1>
                    <button
                        type='button'
                        onClick={() => router.back()}
                        className='text-gray-500 hover:text-gray-700 text-sm underline'
                    >
                        뒤로가기
                    </button>
                </div>

                <form onSubmit={handleSubmit} className='space-y-8'>
                    {/* 1. 기본 설정 (유형, 대상, 필수여부) */}
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-gray-100'>
                        <div>
                            <label className='block mb-1.5 font-semibold text-gray-700'>
                                약관 유형 <span className='text-red-500'>*</span>
                            </label>
                            <select
                                value={code}
                                onChange={(e) => setCode(e.target.value as TermsType)}
                                className='w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none'
                                required
                            >
                                <option value=''>선택해주세요</option>
                                {TERMS_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className='block mb-1.5 font-semibold text-gray-700'>
                                적용 대상 <span className='text-red-500'>*</span>
                            </label>
                            <select
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value as TargetRole)}
                                className='w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none'
                                required
                            >
                                <option value=''>선택해주세요</option>
                                {TARGET_ROLE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className='block mb-1.5 font-semibold text-gray-700'>
                                필수 여부 <span className='text-red-500'>*</span>
                            </label>
                            <div className='flex items-center gap-4 h-[46px]'>
                                <label className='flex items-center gap-2 cursor-pointer'>
                                    <input
                                        type='radio'
                                        name='isMandatory'
                                        checked={isMandatory === true}
                                        onChange={() => setIsMandatory(true)}
                                        className='w-4 h-4 text-blue-600'
                                    />
                                    <span className='text-gray-700'>필수</span>
                                </label>
                                <label className='flex items-center gap-2 cursor-pointer'>
                                    <input
                                        type='radio'
                                        name='isMandatory'
                                        checked={isMandatory === false}
                                        onChange={() => setIsMandatory(false)}
                                        className='w-4 h-4 text-blue-600'
                                    />
                                    <span className='text-gray-700'>선택</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* [추가] 2. 제목 입력 영역 */}
                    <div>
                        <label className='block mb-1.5 font-semibold text-gray-700'>
                            약관 제목 <span className='text-red-500'>*</span>
                        </label>
                        <input
                            type='text'
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder='예: [필수] 서비스 이용약관 (2025.12.07 개정)'
                            className='w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none text-gray-800 placeholder-gray-400'
                            required
                        />
                    </div>

                    {/* 3. 시행일시 */}
                    <div className='pb-6 border-b border-gray-100'>
                        <label className='block mb-1.5 font-semibold text-gray-700'>
                            시행 일시 <span className='text-red-500'>*</span>
                        </label>
                        <div className='flex gap-4 max-w-md'>
                            <input
                                type='date'
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                required
                                className='flex-1 border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none'
                            />
                            <input
                                type='time'
                                value={effectiveTime}
                                onChange={(e) => setEffectiveTime(e.target.value)}
                                required
                                className='flex-1 border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none'
                            />
                        </div>
                        <p className='text-xs text-gray-500 mt-1'>
                            * 해당 시간부터 사용자에게 약관이 노출되거나 적용됩니다.
                        </p>
                    </div>

                    {/* 4. 약관 내용 작성 */}
                    <div>
                        <div className='flex justify-between items-end mb-3'>
                            <label className='font-semibold text-gray-700 text-lg'>약관 내용 작성</label>
                            <span className='text-sm text-gray-500'>작성한 형태 그대로 저장됩니다.</span>
                        </div>

                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]'>
                            {/* 좌측: 에디터 */}
                            <div className='flex flex-col h-full border border-gray-300 rounded-lg overflow-hidden shadow-sm bg-white'>
                                <div className='bg-gray-100 px-4 py-2 border-b font-semibold text-gray-700 text-sm'>
                                    Editor
                                </div>
                                <div className='flex-1 bg-white'>
                                    <TextEditor
                                        value={content}
                                        onChange={setContent}
                                        placeholder='내용을 입력하세요...'
                                    />
                                </div>
                            </div>

                            {/* 우측: 미리보기 */}
                            <div className='flex flex-col h-full border border-blue-200 rounded-lg overflow-hidden shadow-sm'>
                                <div className='bg-blue-50 px-4 py-2 border-b border-blue-200 font-semibold text-blue-700 text-sm'>
                                    Preview
                                </div>
                                <div className='flex-1 bg-white overflow-y-auto p-4'>
                                    {/* SunEditor 스타일 적용 */}
                                    <div
                                        className='sun-editor-editable'
                                        dangerouslySetInnerHTML={{ __html: content }}
                                        style={{ border: 'none', padding: 0 }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className='pt-6 border-t border-gray-100 mt-8'>
                        <button
                            type='submit'
                            disabled={isSubmitting}
                            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all ${
                                isSubmitting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                            }`}
                        >
                            {isSubmitting ? '등록 중...' : '약관 등록하기'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
