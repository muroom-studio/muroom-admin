'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Next.js Image 최적화 사용 (설정 필요 시 img 태그로 대체 가능)

// --- Type Definitions (API 응답 구조에 맞춤) ---

interface SubwayLine {
    lineName: string;
    lineColor: string;
}

interface NearbySubwayStationInfo {
    stationName: string;
    lines: SubwayLine[];
    walkingTimeMinutes: number | null;
}

interface StudioItem {
    studioId: number;
    studioName: string;
    minPrice: number | null;
    maxPrice: number | null;
    nearbySubwayStationInfo: NearbySubwayStationInfo;
    thumbnailImageUrl: string;
    walkingTimeMinutes: number | null; // 루트 레벨에도 있는 것으로 보임
    longitude: number;
    latitude: number;
}

interface PaginationInfo {
    pageNumber: number;
    pageSize: number;
    totalPages: number;
    totalElements: number;
    isFirst: boolean;
    isLast: boolean;
}

interface StudioListResponse {
    status: number;
    message: string;
    data: {
        content: StudioItem[];
        pagination: PaginationInfo;
    };
}

// --- Helper Functions ---

// 가격 포맷팅 (예: 500000 -> 500,000원)
const formatPrice = (price: number | null) => {
    if (price === null) return null;
    return new Intl.NumberFormat('ko-KR').format(price);
};

export default function StudioListPage() {
    const [studios, setStudios] = useState<StudioItem[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0); // 현재 페이지 (0부터 시작)

    // 환경 변수 처리
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

    // 데이터 불러오기
    const fetchStudios = async (currentPage: number) => {
        setIsLoading(true);
        try {
            // 요청 파라미터 설정 (지도 범위는 일단 고정값 사용, 필요 시 상태로 관리)
            const queryParams = new URLSearchParams({
                minLatitude: '32',
                maxLatitude: '39',
                minLongitude: '124',
                maxLongitude: '133',
                sort: 'latest,desc',
                page: currentPage.toString(),
                size: '10', // 한 페이지당 10개
            });

            const res = await fetch(`/api/v1/studios/map-list?${queryParams.toString()}`);

            if (!res.ok) {
                throw new Error('스튜디오 목록을 불러오는데 실패했습니다.');
            }

            const responseBody: StudioListResponse = await res.json();

            setStudios(responseBody.data.content);
            setPagination(responseBody.data.pagination);
        } catch (error) {
            console.error(error);
            alert('데이터 로딩 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 페이지 변경 시 fetch 실행
    useEffect(() => {
        fetchStudios(page);
    }, [page]);

    // 페이지 변경 핸들러
    const handlePageChange = (newPage: number) => {
        if (newPage >= 0 && pagination && newPage < pagination.totalPages) {
            setPage(newPage);
            window.scrollTo(0, 0); // 상단으로 스크롤 이동
        }
    };

    return (
        <div className='min-h-screen bg-gray-50 p-8'>
            <div className='max-w-7xl mx-auto'>
                {/* 헤더 섹션 */}
                <div className='flex justify-between items-center mb-8'>
                    <h1 className='text-3xl font-bold text-gray-800'>스튜디오 목록</h1>
                    <div className='flex gap-5'>
                        <Link
                            href='/studios/new'
                            className='bg-blue-600 text-white px-5 py-2.5 rounded-md font-semibold hover:bg-blue-700 transition-colors shadow-sm'
                        >
                            + STUDIO
                        </Link>
                        <Link
                            href='/owners/new'
                            className='bg-green-600 text-white px-5 py-2.5 rounded-md font-semibold hover:bg-green-700 transition-colors shadow-sm'
                        >
                            + OWNER
                        </Link>
                    </div>
                </div>

                {/* 로딩 상태 */}
                {isLoading ? (
                    <div className='flex justify-center items-center h-64'>
                        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
                    </div>
                ) : (
                    <>
                        {/* 스튜디오 리스트 그리드 */}
                        {studios.length > 0 ? (
                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                                {studios.map((studio) => (
                                    // [수정] div를 Link로 변경하여 클릭 시 상세 페이지로 이동
                                    <Link
                                        href={`/studios/${studio.studioId}`} // 상세 페이지 경로
                                        key={studio.studioId}
                                        className='block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 flex flex-col cursor-pointer'
                                    >
                                        {/* ... (카드 내부 내용은 기존과 동일) ... */}
                                        {/* 썸네일 이미지 */}
                                        <div className='relative h-48 w-full bg-gray-200'>
                                            {studio.thumbnailImageUrl ? (
                                                <img
                                                    src={studio.thumbnailImageUrl}
                                                    alt={studio.studioName}
                                                    className='w-full h-full object-cover'
                                                />
                                            ) : (
                                                <div className='flex items-center justify-center h-full text-gray-400'>
                                                    이미지 없음
                                                </div>
                                            )}
                                        </div>

                                        {/* 컨텐츠 영역 */}
                                        <div className='p-5 flex flex-col flex-1'>
                                            <div className='flex justify-between items-start mb-2'>
                                                <h2 className='text-xl font-bold text-gray-900 line-clamp-1'>
                                                    {studio.studioName}
                                                </h2>
                                                <span className='text-xs text-gray-400'>ID: {studio.studioId}</span>
                                            </div>

                                            {/* 지하철 정보 */}
                                            <div className='flex items-center gap-2 mb-4'>
                                                <span className='font-medium text-gray-700'>
                                                    {studio.nearbySubwayStationInfo.stationName}
                                                </span>
                                                <div className='flex gap-1'>
                                                    {studio.nearbySubwayStationInfo.lines.map((line, idx) => (
                                                        <span
                                                            key={idx}
                                                            className='text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold'
                                                            style={{ backgroundColor: line.lineColor }}
                                                        >
                                                            {line.lineName}
                                                        </span>
                                                    ))}
                                                </div>
                                                {studio.nearbySubwayStationInfo.walkingTimeMinutes && (
                                                    <span className='text-sm text-gray-500'>
                                                        도보 {studio.nearbySubwayStationInfo.walkingTimeMinutes}분
                                                    </span>
                                                )}
                                            </div>

                                            <div className='mt-auto border-t pt-4'>
                                                {/* 가격 정보 */}
                                                <div className='flex justify-between items-center'>
                                                    <span className='text-gray-500 text-sm'>가격대 (월)</span>
                                                    <div className='font-bold text-lg text-blue-600'>
                                                        {studio.minPrice && studio.maxPrice ? (
                                                            <>
                                                                {formatPrice(studio.minPrice)} ~{' '}
                                                                {formatPrice(studio.maxPrice)}
                                                                <span className='text-sm text-gray-500 font-normal'>
                                                                    {' '}
                                                                    원
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className='text-gray-400 text-base'>
                                                                가격 정보 없음
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link> // [수정] Link 닫기
                                ))}
                            </div>
                        ) : (
                            <div className='text-center py-20 bg-white rounded-lg border border-gray-200'>
                                <p className='text-gray-500 text-lg'>등록된 스튜디오가 없습니다.</p>
                            </div>
                        )}

                        {/* 페이지네이션 */}
                        {pagination && pagination.totalPages > 0 && (
                            <div className='flex justify-center items-center mt-10 gap-2'>
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={pagination.isFirst}
                                    className='px-4 py-2 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                                >
                                    이전
                                </button>
                                <span className='text-gray-600 px-2'>
                                    {pagination.pageNumber + 1} / {pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={pagination.isLast}
                                    className='px-4 py-2 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                                >
                                    다음
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
