import localFont from 'next/font/local';

export const pretendard = localFont({
    src: '../../assets/fonts/PretendardVariable.woff2',
    display: 'swap',
    weight: '100 900',
    variable: '--font-pretendard',
    preload: true,
});
