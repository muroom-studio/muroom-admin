'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import 'react-quill-new/dist/quill.snow.css'; // 스타일 시트 임포트

// SSR 방지를 위한 dynamic import
const ReactQuill = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className='h-96 bg-gray-50 animate-pulse rounded-lg border'>Loading Editor...</div>,
});

interface TextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export default function TextEditor({ value, onChange, placeholder }: TextEditorProps) {
    // 툴바 설정 (약관 작성에 필요한 기능 위주)
    const modules = useMemo(
        () => ({
            toolbar: {
                container: [
                    [{ header: [1, 2, 3, false] }], // 제목 크기
                    ['bold', 'underline'], // 굵게, 밑줄
                    [{ list: 'ordered' }, { list: 'bullet' }], // 번호 리스트, 점 리스트
                    [{ indent: '-1' }, { indent: '+1' }], // 들여쓰기 (약관 조항 작성 시 필수)
                    [{ align: [] }], // 정렬
                    ['clean'], // 서식 지우기
                ],
            },
        }),
        []
    );

    return (
        <div className='h-[500px]'>
            {' '}
            {/* 에디터 높이 고정 */}
            <ReactQuill
                theme='snow'
                value={value}
                onChange={onChange}
                modules={modules}
                className='h-full bg-white'
                placeholder={placeholder}
            />
        </div>
    );
}
