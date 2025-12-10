'use client';

import dynamic from 'next/dynamic';
import 'suneditor/dist/css/suneditor.min.css'; // SunEditor 스타일

// SSR 방지를 위한 dynamic import
const SunEditor = dynamic(() => import('suneditor-react'), {
    ssr: false,
    loading: () => <div className='h-96 bg-gray-50 animate-pulse rounded-lg border'>Loading Editor...</div>,
});

interface TextEditorProps {
    value: string; // 초기값
    onChange: (content: string) => void; // 변경 핸들러
    placeholder?: string;
}

export default function TextEditor({ value, onChange, placeholder }: TextEditorProps) {
    return (
        <div className='h-[500px]'>
            <SunEditor
                setContents={value} // 초기값 설정
                onChange={onChange} // 내용 변경 시 부모에게 전달
                setOptions={{
                    height: '100%', // 높이 100% (부모 div인 h-[500px]을 따라감)
                    placeholder: placeholder,
                    buttonList: [
                        ['undo', 'redo'],
                        ['font', 'fontSize', 'formatBlock'],
                        ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
                        ['fontColor', 'hiliteColor'],
                        ['removeFormat'],
                        ['outdent', 'indent'],
                        ['align', 'horizontalRule', 'list', 'lineHeight'],
                        ['table', 'link', 'image'], // [핵심] 여기에 'table'이 있어서 표 생성이 가능합니다!
                        ['fullScreen', 'showBlocks', 'codeView'],
                        ['preview', 'print'],
                    ],
                    // 폰트 설정 (선택 사항)
                    font: ['Pretendard', 'Arial', 'Tohoma', 'Courier New,Courier'],
                }}
            />
        </div>
    );
}
