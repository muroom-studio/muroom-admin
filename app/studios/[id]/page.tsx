'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

// --- Type Definitions (API 응답 구조) ---

interface SubwayLine {
    lineName: string;
    lineColor: string;
}

interface NearbySubwayStation {
    stationName: string;
    lines: SubwayLine[];
    walkingTimeMinutes: number;
}

interface OptionItem {
    code: string;
    description: string;
    iconImageKey: string;
}

interface RoomItem {
    roomId: number;
    roomName: string;
    isAvailable: boolean | null; // null 가능
    availableAt: string | null;
    widthMm: number | null;
    heightMm: number | null;
    roomBasePrice: number | null;
}

interface StudioDetailData {
    studioBaseInfo: {
        studioId: number;
        studioName: string;
        roadNameAddress: string;
        lotNumberAddress: string;
        detailedAddress: string;
        studioMinPrice: number | null;
        studioMaxPrice: number | null;
        depositAmount: number | null;
        nearbySubwayStations: NearbySubwayStation[];
    };
    studioBuildingInfo: {
        floorType: { description: string; code: string };
        floorNumber: number;
        // [수정] boolean -> boolean | null
        hasRestroom: boolean | null;
        restroomLocation: { description: string; code: string } | null;
        restroomGender: { description: string; code: string } | null;
        parkingFeeType: { description: string; code: string } | null;
        parkingFeeInfo: string | null;
        parkingSpots: number | null;
        parkingLocationName: string | null;
        parkingLocationAddress: string | null;
        isLodgingAvailable: boolean | null;
        hasFireInsurance: boolean | null;
    };
    studioNotice: {
        ownerNickname: string;
        ownerPhoneNumber: string;
        introduction: string;
        isIdentityVerified: boolean;
    };
    studioForbiddenInstruments: {
        instruments: string[];
    };
    studioRooms: {
        rooms: RoomItem[];
    };
    studioOptions: {
        commonOptions: OptionItem[];
        individualOptions: OptionItem[];
    };
    studioImages: {
        mainImageKeys: string[];
        buildingImageKeys: string[];
        roomImageKeys: string[];
        blueprintImageKey: string;
        commonOptionImageKeys: string[];
        individualOptionImageKeys: string[];
    };
}

// --- Helper Functions ---

// 가격 포맷팅 (null이면 '문의필요')
const formatPrice = (price: number | null) => {
    if (price === null) return '문의필요';
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
};

// [추가] 3-State 상태 렌더링 헬퍼 (True / False / Null)
const renderStatus = (value: boolean | null, trueText: string, falseText: string) => {
    if (value === null) {
        return <span className='text-gray-400 font-medium'>문의필요</span>;
    }
    return value ? (
        <span className='text-blue-600 font-medium'>{trueText}</span>
    ) : (
        <span className='text-gray-600'>{falseText}</span>
    );
};

export default function StudioDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [data, setData] = useState<StudioDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/studios/${params.id}`);
                if (!res.ok) throw new Error('상세 정보를 불러오지 못했습니다.');
                const responseBody = await res.json();
                setData(responseBody.data);
            } catch (error) {
                console.error(error);
                alert('데이터 로딩 실패');
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) fetchDetail();
    }, [params.id]);

    if (isLoading) return <div className='flex justify-center items-center h-screen'>로딩 중...</div>;
    if (!data) return <div className='flex justify-center items-center h-screen'>데이터가 없습니다.</div>;

    const {
        studioBaseInfo: base,
        studioBuildingInfo: build,
        studioNotice: notice,
        studioRooms,
        studioOptions,
        studioImages,
    } = data;

    return (
        <div className='min-h-screen bg-gray-50 p-8'>
            <div className='max-w-5xl mx-auto space-y-8'>
                {/* 헤더 & 메인 이미지 */}
                <div className='bg-white rounded-xl shadow-sm p-6'>
                    <div className='flex justify-between items-start mb-6'>
                        <div>
                            <h1 className='text-3xl font-bold text-gray-900'>{base.studioName}</h1>
                            <p className='text-gray-500 mt-1'>
                                {base.roadNameAddress} {base.detailedAddress}
                            </p>
                        </div>
                        <div className='text-right'>
                            <span className='block text-sm text-gray-500'>가격대 (월)</span>
                            <span className='text-2xl font-bold text-blue-600'>
                                {base.studioMinPrice === null && base.studioMaxPrice === null ? (
                                    <span className='text-gray-400 text-xl'>가격 문의</span>
                                ) : (
                                    <>
                                        {formatPrice(base.studioMinPrice)} ~ {formatPrice(base.studioMaxPrice)}
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* 메인 이미지 슬라이더 */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2 h-80'>
                        {studioImages.mainImageKeys[0] ? (
                            <Image
                                src={studioImages.mainImageKeys[0]}
                                alt='메인1'
                                width={640}
                                height={320}
                                className='w-full h-80 object-cover rounded-lg'
                            />
                        ) : (
                            <div className='w-full h-full bg-gray-200 flex items-center justify-center rounded-l-lg'>
                                이미지 없음
                            </div>
                        )}
                        <div className='grid grid-cols-2 gap-2'>
                            {/* 서브 이미지 (메인 나머지 + 건물 이미지) */}
                            {studioImages.mainImageKeys
                                .slice(1)
                                .concat(studioImages.buildingImageKeys)
                                .slice(0, 4)
                                .map((src, idx) => (
                                    <Image
                                        key={idx}
                                        src={src}
                                        alt='서브'
                                        width={320}
                                        height={160}
                                        className='w-full h-full object-cover rounded-md'
                                    />
                                ))}
                        </div>
                    </div>
                </div>

                {/* 상세 정보 그리드 */}
                <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                    {/* 왼쪽 컬럼 (주요 정보) */}
                    <div className='lg:col-span-2 space-y-8'>
                        {/* 1. 소개 */}
                        <section className='bg-white rounded-xl shadow-sm p-6'>
                            <h2 className='text-xl font-bold mb-4 border-b pb-2'>스튜디오 소개</h2>
                            <pre className='whitespace-pre-wrap text-gray-700 font-sans leading-relaxed'>
                                {notice.introduction}
                            </pre>
                        </section>

                        {/* 2. 옵션 정보 */}
                        <section className='bg-white rounded-xl shadow-sm p-6'>
                            <h2 className='text-xl font-bold mb-4 border-b pb-2'>옵션 및 시설</h2>

                            <div className='mb-6'>
                                <h3 className='font-semibold text-gray-800 mb-3'>공용 옵션</h3>
                                {studioOptions.commonOptions.length > 0 ? (
                                    <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                                        {studioOptions.commonOptions.map((opt) => (
                                            <div
                                                key={opt.code}
                                                className='flex items-center gap-2 bg-gray-50 p-2 rounded border'
                                            >
                                                <span className='text-sm'>{opt.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className='text-gray-400 text-sm'>정보 없음</span>
                                )}
                            </div>

                            <div>
                                <h3 className='font-semibold text-gray-800 mb-3'>개별 옵션</h3>
                                {studioOptions.individualOptions.length > 0 ? (
                                    <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                                        {studioOptions.individualOptions.map((opt) => (
                                            <div
                                                key={opt.code}
                                                className='flex items-center gap-2 bg-gray-50 p-2 rounded border'
                                            >
                                                <span className='text-sm'>{opt.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <span className='text-gray-400 text-sm'>정보 없음</span>
                                )}
                            </div>
                        </section>

                        {/* 3. 룸 정보 */}
                        <section className='bg-white rounded-xl shadow-sm p-6'>
                            <h2 className='text-xl font-bold mb-4 border-b pb-2'>
                                룸 정보 ({studioRooms.rooms.length}개)
                            </h2>
                            <div className='space-y-4'>
                                {studioRooms.rooms.map((room) => (
                                    <div
                                        key={room.roomId}
                                        className='border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50'
                                    >
                                        <div>
                                            <div className='flex items-center gap-2 mb-1'>
                                                <span className='font-bold text-lg'>{room.roomName}</span>
                                                {/* 룸 상태 표시 */}
                                                {room.isAvailable === null ? (
                                                    <span className='bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded'>
                                                        상태 문의
                                                    </span>
                                                ) : room.isAvailable ? (
                                                    <span className='bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded'>
                                                        즉시 입주 가능
                                                    </span>
                                                ) : (
                                                    <span className='bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded'>
                                                        {room.availableAt ? `${room.availableAt} 이후 가능` : '입실 중'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className='text-sm text-gray-500'>
                                                {room.widthMm || '?'} x {room.heightMm || '?'} mm
                                            </div>
                                        </div>
                                        <div className='text-right'>
                                            <span className='block font-bold text-blue-600 text-lg'>
                                                {formatPrice(room.roomBasePrice)}
                                            </span>
                                            <span className='text-xs text-gray-400'>/ 월</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 4. 금지 악기 */}
                        <section className='bg-white rounded-xl shadow-sm p-6'>
                            <h2 className='text-xl font-bold mb-4 border-b pb-2'>금지 악기</h2>
                            <div className='flex gap-2 flex-wrap'>
                                {data.studioForbiddenInstruments.instruments.length > 0 ? (
                                    data.studioForbiddenInstruments.instruments.map((inst, i) => (
                                        <span
                                            key={i}
                                            className='bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm font-medium border border-red-100'
                                        >
                                            🚫 {inst}
                                        </span>
                                    ))
                                ) : (
                                    <span className='text-gray-400'>없음</span>
                                )}
                            </div>
                        </section>

                        {/* 5. 도면 이미지 */}
                        {studioImages.blueprintImageKey && (
                            <section className='bg-white rounded-xl shadow-sm p-6'>
                                <h2 className='text-xl font-bold mb-4 border-b pb-2'>도면</h2>
                                <div className='bg-gray-100 rounded-lg overflow-hidden'>
                                    <Image
                                        src={studioImages.blueprintImageKey}
                                        alt='도면'
                                        className='w-full object-contain max-h-96'
                                        width={640}
                                        height={320}
                                    />
                                </div>
                            </section>
                        )}
                    </div>

                    {/* 오른쪽 컬럼 (요약 정보 & 연락처) */}
                    <div className='lg:col-span-1 space-y-8'>
                        {/* 건물 정보 카드 */}
                        <section className='bg-white rounded-xl shadow-sm p-6 sticky top-8 border border-gray-100'>
                            <h3 className='font-bold text-gray-900 mb-4 text-lg'>건물 정보</h3>
                            <ul className='space-y-4 text-sm text-gray-700'>
                                <li className='flex justify-between items-center border-b border-gray-100 pb-2'>
                                    <span className='text-gray-500'>층수</span>
                                    <span className='font-medium'>
                                        {build.floorType.description} {build.floorNumber}층
                                    </span>
                                </li>

                                <li className='flex justify-between items-center border-b border-gray-100 pb-2'>
                                    <span className='text-gray-500'>화장실</span>
                                    {/* 화장실 로직: null -> 문의필요 / true -> 상세정보 / false -> 없음 */}
                                    <div className='text-right'>
                                        {build.hasRestroom === null ? (
                                            <span className='text-gray-400 font-medium'>문의필요</span>
                                        ) : build.hasRestroom ? (
                                            <span className='font-medium'>
                                                {build.restroomLocation?.description || '-'} /{' '}
                                                {build.restroomGender?.description || '-'}
                                            </span>
                                        ) : (
                                            <span className='text-gray-600'>없음</span>
                                        )}
                                    </div>
                                </li>

                                <li className='flex justify-between items-center border-b border-gray-100 pb-2'>
                                    <span className='text-gray-500'>주차</span>
                                    <div className='text-right'>
                                        {/* 주차비 유형이 없으면 문의필요 */}
                                        {build.parkingFeeType ? (
                                            <>
                                                <span className='block font-medium'>
                                                    {build.parkingFeeType.description}
                                                </span>
                                                {build.parkingSpots !== null && (
                                                    <span className='text-xs text-gray-400'>
                                                        ({build.parkingSpots}대)
                                                    </span>
                                                )}
                                                {build.parkingFeeInfo && (
                                                    <span className='block text-xs text-gray-500 mt-0.5'>
                                                        {build.parkingFeeInfo}
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className='text-gray-400 font-medium'>문의필요</span>
                                        )}
                                    </div>
                                </li>

                                <li className='flex justify-between items-center border-b border-gray-100 pb-2'>
                                    <span className='text-gray-500'>숙소 가능</span>
                                    {renderStatus(build.isLodgingAvailable, '가능', '불가능')}
                                </li>

                                <li className='flex justify-between items-center pb-2'>
                                    <span className='text-gray-500'>화재 보험</span>
                                    {renderStatus(build.hasFireInsurance, '가입됨', '미가입')}
                                </li>
                            </ul>

                            <div className='mt-8'>
                                <h3 className='font-bold text-gray-900 mb-4 text-lg'>사장님 정보</h3>
                                <div className='bg-blue-50 p-4 rounded-lg border border-blue-100'>
                                    <div className='flex items-center gap-3 mb-2'>
                                        <div className='w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg'>
                                            {notice.ownerNickname ? notice.ownerNickname[0] : 'U'}
                                        </div>
                                        <div>
                                            <p className='font-bold text-gray-800'>{notice.ownerNickname}</p>
                                            <p className='text-xs text-gray-500'>
                                                {notice.isIdentityVerified ? '인증된 사용자' : '미인증'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className='mt-3 pt-3 border-t border-blue-200'>
                                        <p className='text-sm text-gray-600 mb-1'>연락처</p>
                                        <p className='font-bold text-lg text-blue-700 tracking-wide'>
                                            {notice.ownerPhoneNumber}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className='mt-8'>
                                <h3 className='font-bold text-gray-900 mb-4 text-lg'>위치 / 교통</h3>
                                <p className='text-sm text-gray-600 mb-4'>{base.lotNumberAddress}</p>
                                <div className='space-y-2'>
                                    {base.nearbySubwayStations.map((station, idx) => (
                                        <div
                                            key={idx}
                                            className='flex items-center gap-2 text-sm bg-gray-50 p-2 rounded'
                                        >
                                            <span className='font-bold text-gray-800'>{station.stationName}</span>
                                            <div className='flex gap-1'>
                                                {station.lines.map((line, lIdx) => (
                                                    <span
                                                        key={lIdx}
                                                        className='text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold'
                                                        style={{ backgroundColor: line.lineColor }}
                                                    >
                                                        {line.lineName}
                                                    </span>
                                                ))}
                                            </div>
                                            <span className='text-gray-500 text-xs ml-auto'>
                                                도보 {station.walkingTimeMinutes}분
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className='mt-8 flex gap-2'>
                                <button
                                    onClick={() => router.push('/studios')}
                                    className='flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors'
                                >
                                    목록으로
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
