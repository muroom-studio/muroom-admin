'use client';

import dynamic from 'next/dynamic';
import 'suneditor/dist/css/suneditor.min.css';

// SSR 방지
const SunEditor = dynamic(() => import('suneditor-react'), {
    ssr: false,
    loading: () => <div className='h-96 bg-gray-50 animate-pulse rounded-lg border'>Loading...</div>,
});

interface TextEditorProps {
    value: string;
    onChange: (content: string) => void;
    placeholder?: string;
    height?: string; // [추가] 높이를 외부에서 조절할 수 있도록 prop 추가
}

export default function TextEditor({ value, onChange, placeholder, height = '500px' }: TextEditorProps) {
    return (
        // [수정] 부모 div의 h-[500px] 제거 -> SunEditor가 알아서 높이 잡음
        <div>
            <SunEditor
                setContents={value}
                onChange={onChange}
                setOptions={{
                    height: height, // [핵심] 여기에 고정 픽셀(예: '500px')이 들어가야 내부 스크롤이 생깁니다.
                    placeholder: placeholder,
                    buttonList: [
                        ['undo', 'redo'],
                        ['font', 'fontSize', 'formatBlock'],
                        ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
                        ['fontColor', 'hiliteColor'],
                        ['removeFormat'],
                        ['outdent', 'indent'],
                        ['align', 'horizontalRule', 'list', 'lineHeight'],
                        ['table', 'link', 'image'],
                        ['fullScreen', 'showBlocks', 'codeView'],
                        ['preview', 'print'],
                    ],
                    font: ['Pretendard', 'Arial', 'Tohoma', 'Courier New,Courier'],
                    // [추가 옵션] 혹시 모를 상황 대비 (크기 조절 바)
                    resizingBar: false,
                }}
            />
        </div>
    );
}
