'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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
    isAvailable: boolean;
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
        hasRestroom: boolean;
        restroomLocation: { description: string; code: string } | null;
        restroomGender: { description: string; code: string } | null;
        parkingFeeType: { description: string; code: string } | null;
        parkingFeeInfo: string | null;
        parkingSpots: number | null;
        parkingLocationName: string | null;
        parkingLocationAddress: string | null;
        isLodgingAvailable: boolean;
        hasFireInsurance: boolean;
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
const formatPrice = (price: number | null) => {
    if (price === null) return '-';
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
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
                                {formatPrice(base.studioMinPrice)} ~ {formatPrice(base.studioMaxPrice)}
                            </span>
                        </div>
                    </div>

                    {/* 메인 이미지 슬라이더 (여기선 간단히 그리드로 표시) */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2 h-80'>
                        {studioImages.mainImageKeys[0] && (
                            <img
                                src={studioImages.mainImageKeys[0]}
                                alt='메인1'
                                className='w-full h-full object-cover rounded-l-lg'
                            />
                        )}
                        <div className='grid grid-cols-2 gap-2'>
                            {/* 나머지 메인 이미지 혹은 건물 이미지 보여주기 */}
                            {studioImages.mainImageKeys
                                .slice(1)
                                .concat(studioImages.buildingImageKeys)
                                .slice(0, 4)
                                .map((src, idx) => (
                                    <img
                                        key={idx}
                                        src={src}
                                        alt='서브'
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
                            <pre className='whitespace-pre-wrap text-gray-700 font-sans'>{notice.introduction}</pre>
                        </section>

                        {/* 2. 옵션 정보 */}
                        <section className='bg-white rounded-xl shadow-sm p-6'>
                            <h2 className='text-xl font-bold mb-4 border-b pb-2'>옵션 및 시설</h2>

                            <div className='mb-6'>
                                <h3 className='font-semibold text-gray-800 mb-3'>공용 옵션</h3>
                                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                                    {studioOptions.commonOptions.map((opt) => (
                                        <div
                                            key={opt.code}
                                            className='flex items-center gap-2 bg-gray-50 p-2 rounded border'
                                        >
                                            {/* 아이콘 이미지가 있다면 표시 (경로 확인 필요) */}
                                            {/* <img src={opt.iconImageKey} className="w-5 h-5" /> */}
                                            <span className='text-sm'>{opt.description}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className='font-semibold text-gray-800 mb-3'>개별 옵션</h3>
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
                                                {room.isAvailable ? (
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
                                                {room.widthMm} x {room.heightMm} mm
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
                                {data.studioForbiddenInstruments.instruments.map((inst, i) => (
                                    <span
                                        key={i}
                                        className='bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm font-medium border border-red-100'
                                    >
                                        🚫 {inst}
                                    </span>
                                ))}
                            </div>
                        </section>

                        {/* 5. 도면 이미지 */}
                        <section className='bg-white rounded-xl shadow-sm p-6'>
                            <h2 className='text-xl font-bold mb-4 border-b pb-2'>도면</h2>
                            <div className='bg-gray-100 rounded-lg overflow-hidden'>
                                <img
                                    src={studioImages.blueprintImageKey}
                                    alt='도면'
                                    className='w-full object-contain max-h-96'
                                />
                            </div>
                        </section>
                    </div>

                    {/* 오른쪽 컬럼 (요약 정보 & 연락처) */}
                    <div className='lg:col-span-1 space-y-8'>
                        {/* 건물 정보 카드 */}
                        <section className='bg-white rounded-xl shadow-sm p-6 sticky top-8'>
                            <h3 className='font-bold text-gray-900 mb-4 text-lg'>건물 정보</h3>
                            <ul className='space-y-3 text-sm text-gray-700'>
                                <li className='flex justify-between border-b pb-2'>
                                    <span className='text-gray-500'>층수</span>
                                    <span>
                                        {build.floorType.description} {build.floorNumber}층
                                    </span>
                                </li>
                                <li className='flex justify-between border-b pb-2'>
                                    <span className='text-gray-500'>화장실</span>
                                    <span>
                                        {build.hasRestroom
                                            ? `${build.restroomLocation?.description || '-'} / ${
                                                  build.restroomGender?.description || '-'
                                              }`
                                            : '없음'}
                                    </span>
                                </li>
                                <li className='flex justify-between border-b pb-2'>
                                    <span className='text-gray-500'>주차</span>
                                    <div className='text-right'>
                                        <span className='block'>{build.parkingFeeType?.description || '-'}</span>
                                        {build.parkingSpots && (
                                            <span className='text-xs text-gray-400'>({build.parkingSpots}대 가능)</span>
                                        )}
                                        {build.parkingFeeInfo && (
                                            <span className='block text-xs text-gray-500'>{build.parkingFeeInfo}</span>
                                        )}
                                    </div>
                                </li>
                                <li className='flex justify-between border-b pb-2'>
                                    <span className='text-gray-500'>숙소 가능</span>
                                    <span>{build.isLodgingAvailable ? '가능' : '불가능'}</span>
                                </li>
                                <li className='flex justify-between pb-2'>
                                    <span className='text-gray-500'>화재 보험</span>
                                    <span>{build.hasFireInsurance ? '가입됨' : '미가입'}</span>
                                </li>
                            </ul>

                            <div className='mt-8'>
                                <h3 className='font-bold text-gray-900 mb-4 text-lg'>사장님 정보</h3>
                                <div className='bg-gray-100 p-4 rounded-lg'>
                                    <div className='flex items-center gap-3 mb-2'>
                                        <div>
                                            <p className='font-bold text-gray-800'>{notice.ownerNickname}</p>
                                            <p className='text-xs text-gray-500'>
                                                {notice.isIdentityVerified ? '인증된 사용자' : '미인증 사용자'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className='mt-3 pt-3 border-t border-blue-100'>
                                        <p className='text-sm text-gray-600'>연락처</p>
                                        <p className='font-bold text-lg'>{notice.ownerPhoneNumber}</p>
                                    </div>
                                </div>
                            </div>

                            <div className='mt-8'>
                                <h3 className='font-bold text-gray-900 mb-4 text-lg'>위치 / 교통</h3>
                                <p className='text-sm text-gray-600 mb-4'>{base.lotNumberAddress}</p>
                                <div className='space-y-2'>
                                    {base.nearbySubwayStations.map((station, idx) => (
                                        <div key={idx} className='flex items-center gap-2 text-sm'>
                                            <span className='font-bold text-gray-800'>{station.stationName}</span>
                                            <div className='flex gap-1'>
                                                {station.lines.map((line, lIdx) => (
                                                    <span
                                                        key={lIdx}
                                                        className='text-[10px] text-white px-1.5 py-0.5 rounded-full'
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
                                    onClick={() => router.push('/admin/studios')}
                                    className='flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50'
                                >
                                    목록으로
                                </button>
                                {/* 수정/삭제 기능이 있다면 추가 */}
                                {/* <button className="flex-1 py-3 bg-blue-600 rounded-lg text-white font-bold hover:bg-blue-700">수정하기</button> */}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
