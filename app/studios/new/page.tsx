'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';

// --- Type Definitions ---

interface OptionItem {
    id: number | null;
    code: string;
    description: string;
    iconImageUrl: string | null;
}

interface OptionsFromApi {
    floorOptions: OptionItem[];
    restroomOptions: OptionItem[];
    parkingFeeOptions: OptionItem[];
    studioCommonOptions: OptionItem[];
    studioIndividualOptions: OptionItem[];
    unavailableInstrumentOptions: OptionItem[];
}

interface DaumPostcodeData {
    zonecode: string;
    roadAddress: string;
    jibunAddress: string;
    address: string;
    bname: string;
    buildingName: string;
}

interface Station {
    subwayStationId: string;
    sequence: string;
    // UI 표시용 (서버 전송 시엔 무시되거나 포함되어도 무관함)
    stationName?: string;
    distanceMeters?: number;
    lines?: { lineName: string; lineColor: string }[];
}
interface StudioSubwayLineInfo {
    lineName: string;
    lineColor: string;
}

interface StationInfo {
    stationId: number;
    stationName: string;
    lines: StudioSubwayLineInfo[];
    distanceMeters: number;
}
interface NearbyStationsResponse {
    stations: StationInfo[];
}

// Room 타입 명시
interface RoomInfo {
    roomName: string;
    isAvailable: boolean;
    availableAt: string;
    widthMm: string;
    heightMm: string;
    roomBasePrice: string;
}

type StudioImageCategory = 'MAIN' | 'BUILDING' | 'ROOM' | 'BLUEPRINT';

interface StudioImageInfo {
    fileName: string;
    category: StudioImageCategory;
    contentType: string;
}

interface StudioImagePresignedUrlRequest {
    studioImages: StudioImageInfo[];
}

interface PresignedUrlResponse {
    url: string;
    fileKey: string;
}

// --- Main Component ---

export default function NewStudioPage() {
    const router = useRouter();
    const [stations, setStations] = useState<Station[]>([]);

    const [rooms, setRooms] = useState<RoomInfo[]>([
        { roomName: '', isAvailable: true, availableAt: '', widthMm: '', heightMm: '', roomBasePrice: '' },
    ]);

    const [address, setAddress] = useState({
        zipCode: '',
        roadAddress: '',
        jibunAddress: '',
        detailedAddress: '',
    });

    const [parkingAddress, setParkingAddress] = useState('');

    const [selectedFiles, setSelectedFiles] = useState({
        mainImages: [] as File[],
        buildingImages: [] as File[],
        roomImages: [] as File[],
        blueprintImage: null as File | null,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [optionData, setOptionData] = useState<OptionsFromApi>({
        floorOptions: [],
        restroomOptions: [],
        parkingFeeOptions: [],
        studioCommonOptions: [],
        studioIndividualOptions: [],
        unavailableInstrumentOptions: [],
    });
    const [nearbyCandidates, setNearbyCandidates] = useState<StationInfo[]>([]);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const response = await fetch(`/api/v1/studios/filter-options`);
                const responseBody = await response.json();

                if (response.ok && responseBody.data) {
                    setOptionData(responseBody.data);
                } else {
                    console.error('옵션 데이터를 불러오는 데 실패했습니다:', responseBody.message);
                }
            } catch (error) {
                console.error('옵션 데이터를 불러오는 중 오류 발생:', error);
            }
        };

        fetchOptions();
    }, []);

    // --- Handlers: File ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, category: keyof typeof selectedFiles) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const fileList = Array.from(files);

        setSelectedFiles((prev) => {
            if (category === 'blueprintImage') {
                return { ...prev, [category]: fileList[0] };
            }
            return {
                ...prev,
                [category]: [...(prev[category] as File[]), ...fileList],
            };
        });
        e.target.value = '';
    };

    const removeSelectedFile = (category: keyof typeof selectedFiles, indexToRemove?: number) => {
        setSelectedFiles((prev) => {
            if (category === 'blueprintImage') {
                return { ...prev, [category]: null };
            }
            return {
                ...prev,
                [category]: (prev[category] as File[]).filter((_, i) => i !== indexToRemove),
            };
        });
    };

    // --- Handlers: Room (룸 정보도 동일하게 업데이트 필요) ---
    const addRoom = () => {
        setRooms([
            ...rooms,
            { roomName: '', isAvailable: true, availableAt: '', widthMm: '', heightMm: '', roomBasePrice: '' },
        ]);
    };

    const removeRoom = (index: number) => {
        const newRooms = rooms.filter((_, i) => i !== index);
        setRooms(newRooms);
    };

    // [추가됨] Room 입력 변경 핸들러
    const handleRoomChange = (index: number, field: keyof RoomInfo, value: string | boolean) => {
        const updatedRooms = [...rooms];
        // 타입 안전성을 위해 값 할당 시 타입 단언 필요할 수 있음
        updatedRooms[index] = {
            ...updatedRooms[index],
            [field]: value,
        };
        setRooms(updatedRooms);
    };

    // [수정] 인근 지하철역 가져오기 (전체 리스트 저장)
    const fetchNearbyStations = async (queryAddress: string) => {
        try {
            const encodedAddr = encodeURIComponent(queryAddress);
            const res = await fetch(`/api/v1/subway/nearby?address=${encodedAddr}`);

            if (!res.ok) {
                console.warn('인근 지하철역을 불러오지 못했습니다.');
                return;
            }

            const responseBody = await res.json();
            // 서버 응답 구조: { data: { stations: [...] } } 확인 필요 (앞선 코드 로직 따름)
            const data = (responseBody.data || responseBody) as NearbyStationsResponse;

            if (data.stations && data.stations.length > 0) {
                // [변경] 전체 목록을 후보군 State에 저장 (선택은 사용자가 함)
                setNearbyCandidates(data.stations);
                // 주소가 바뀌었으므로 기존 선택된 역들은 초기화 (선택 사항, 여기선 안전하게 초기화)
                setStations([]);
            } else {
                setNearbyCandidates([]);
                setStations([]);
            }
        } catch (error) {
            console.error('Subway fetch error:', error);
        }
    };

    // [추가] 지하철역 선택/해제 토글 핸들러
    const handleToggleStation = (info: StationInfo) => {
        const stationIdStr = String(info.stationId);
        const isAlreadySelected = stations.some((s) => s.subwayStationId === stationIdStr);

        if (isAlreadySelected) {
            // [해제] 리스트에서 제거하고 순서(sequence) 재정렬
            setStations((prev) =>
                prev
                    .filter((s) => s.subwayStationId !== stationIdStr)
                    .map((s, index) => ({ ...s, sequence: String(index + 1) }))
            );
        } else {
            // [선택] 리스트에 추가 (최대 3개 제한)
            if (stations.length >= 3) {
                alert('지하철역은 최대 3개까지만 선택할 수 있습니다.');
                return;
            }

            setStations((prev) => [
                ...prev,
                {
                    subwayStationId: stationIdStr,
                    sequence: String(prev.length + 1), // 현재 개수 + 1이 순위가 됨
                    stationName: info.stationName, // UI 표시용
                    distanceMeters: info.distanceMeters, // UI 표시용
                    lines: info.lines, // UI 표시용
                },
            ]);
        }
    };
    // --- Handlers: Address ---
    const onClickAddressSearch = () => {
        // @ts-expect-error: window.daum is loaded via script tag
        new window.daum.Postcode({
            oncomplete: function (data: DaumPostcodeData) {
                setAddress((prev) => ({
                    ...prev,
                    zipCode: data.zonecode,
                    roadAddress: data.roadAddress,
                    jibunAddress: data.jibunAddress,
                }));

                const targetAddress = data.roadAddress || data.jibunAddress;
                if (targetAddress) {
                    fetchNearbyStations(targetAddress);
                }

                document.getElementById('detailedAddress')?.focus();
            },
        }).open();
    };

    const onClickParkingAddressSearch = () => {
        // @ts-expect-error: window.daum is loaded via script tag
        new window.daum.Postcode({
            oncomplete: function (data: DaumPostcodeData) {
                const fullAddress = data.roadAddress || data.jibunAddress;
                setParkingAddress(fullAddress);
            },
        }).open();
    };

    const handleDetailAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress({ ...address, detailedAddress: e.target.value });
    };

    // --- Handlers: Submit ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedFiles.mainImages.length === 0) return alert('메인 이미지는 최소 1개 이상 필요합니다.');
        if (!selectedFiles.blueprintImage) return alert('도면 이미지는 필수입니다.');

        if (!confirm('스튜디오를 생성하시겠습니까?')) return;

        setIsSubmitting(true);

        try {
            // 1. 파일 평탄화
            const allFiles: { file: File; category: StudioImageCategory }[] = [];
            selectedFiles.mainImages.forEach((f) => allFiles.push({ file: f, category: 'MAIN' }));
            selectedFiles.buildingImages.forEach((f) => allFiles.push({ file: f, category: 'BUILDING' }));
            selectedFiles.roomImages.forEach((f) => allFiles.push({ file: f, category: 'ROOM' }));
            if (selectedFiles.blueprintImage) {
                allFiles.push({ file: selectedFiles.blueprintImage, category: 'BLUEPRINT' });
            }

            // 2. Presigned URL 일괄 요청
            const presignReqBody: StudioImagePresignedUrlRequest = {
                studioImages: allFiles.map((item) => ({
                    fileName: item.file.name,
                    category: item.category,
                    contentType: item.file.type,
                })),
            };

            const presignRes = await fetch(`/api/admin/studios/presigned-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(presignReqBody),
            });

            if (!presignRes.ok) {
                const errorMsg = await presignRes.text();
                console.error('URL 발급 에러:', errorMsg);
                throw new Error(`이미지 업로드 URL 발급 실패 (${presignRes.status})`);
            }

            const response = await presignRes.json();
            const presignedDataList = response.data?.presignedUrls as PresignedUrlResponse[];

            if (!presignedDataList || presignedDataList.length !== allFiles.length) {
                throw new Error('요청한 파일 개수와 발급된 URL 개수가 일치하지 않습니다.');
            }

            // 3. S3 병렬 업로드
            const uploadPromises = allFiles.map((item, index) => {
                const data = presignedDataList[index];
                if (!data || !data.url) {
                    throw new Error(`${index}번째 파일에 대한 URL 정보(url)가 없습니다.`);
                }
                return fetch(data.url, {
                    method: 'PUT',
                    body: item.file,
                    headers: { 'Content-Type': item.file.type },
                });
            });

            await Promise.all(uploadPromises);

            // 4. 업로드된 키 분류
            const finalImageKeys = {
                mainImageKeys: [] as string[],
                buildingImageKeys: [] as string[],
                roomImageKeys: [] as string[],
                blueprintImageKey: '',
            };

            presignedDataList.forEach((data, index) => {
                const category = allFiles[index].category;
                const key = data.fileKey;

                if (category === 'MAIN') finalImageKeys.mainImageKeys.push(key);
                else if (category === 'BUILDING') finalImageKeys.buildingImageKeys.push(key);
                else if (category === 'ROOM') finalImageKeys.roomImageKeys.push(key);
                else if (category === 'BLUEPRINT') finalImageKeys.blueprintImageKey = key;
            });

            // 5. 최종 데이터 구성
            const formData = new FormData(e.target as HTMLFormElement);

            const studioCreatePayload = {
                studioName: formData.get('studioName'),
                studioMinPrice: Number(formData.get('studioMinPrice')),
                studioMaxPrice: Number(formData.get('studioMaxPrice')),
                depositAmount: Number(formData.get('depositAmount')),
                introduction: formData.get('introduction'),
                ownerPhoneNumber: formData.get('ownerPhoneNumber'),

                addressInfo: address,

                buildingInfo: {
                    floorType: formData.get('buildingInfo.floorType'),
                    floorNumber: Number(formData.get('buildingInfo.floorNumber')),
                    restroomType: formData.get('buildingInfo.restroomType'),
                    isParkingAvailable: formData.get('buildingInfo.isParkingAvailable') === 'true',
                    isLodgingAvailable: formData.get('buildingInfo.isLodgingAvailable') === 'true',
                    hasFireInsurance: formData.get('buildingInfo.hasFireInsurance') === 'true',
                    parkingFeeType: formData.get('buildingInfo.parkingFeeType'),
                    parkingFeeInfo: formData.get('buildingInfo.parkingFeeInfo'),
                    parkingSpots: Number(formData.get('buildingInfo.parkingSpots')),
                    parkingLocationName: formData.get('buildingInfo.parkingLocationName'),
                    parkingLocationAddress: parkingAddress,
                },

                // [중요] State에서 관리되는 stations 사용 (이제 값이 제대로 들어있음)
                nearbyStations: stations,

                optionCodes: formData.getAll('optionCodes'),
                forbiddenInstrumentCodes: formData.getAll('forbiddenInstrumentCodes'),

                // [중요] State에서 관리되는 rooms 사용 (이제 값이 제대로 들어있음)
                rooms: rooms,

                imageKeys: finalImageKeys,
            };

            // 6. 스튜디오 생성 요청
            const createRes = await fetch(`/api/admin/studios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studioCreatePayload),
            });

            if (!createRes.ok) {
                const errorText = await createRes.text();
                throw new Error(`스튜디오 생성 실패: ${errorText}`);
            }

            alert('스튜디오가 성공적으로 생성되었습니다.');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='flex flex-col min-h-screen items-center justify-center p-8'>
            <Script src='//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js' strategy='lazyOnload' />

            <main className='w-full max-w-4xl'>
                <h1 className='text-2xl font-bold mb-10 text-center'>스튜디오 등록</h1>
                <form onSubmit={handleSubmit} id='studio-create-form' className='space-y-6'>
                    {/* ... (기본 정보 Fieldset은 기존과 동일하므로 생략) ... */}
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>기본 정보</legend>
                        <div className='space-y-4 p-2'>
                            <div>
                                <label htmlFor='studioName' className='block mb-1 font-medium'>
                                    스튜디오 이름
                                </label>
                                <input
                                    type='text'
                                    id='studioName'
                                    name='studioName'
                                    required
                                    className='w-full border p-2 rounded-md'
                                />
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                <div>
                                    <label htmlFor='studioMinPrice' className='block mb-1 font-medium'>
                                        스튜디오 최소 가격
                                    </label>
                                    <input
                                        type='number'
                                        id='studioMinPrice'
                                        name='studioMinPrice'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                                <div>
                                    <label htmlFor='studioMaxPrice' className='block mb-1 font-medium'>
                                        스튜디오 최대 가격
                                    </label>
                                    <input
                                        type='number'
                                        id='studioMaxPrice'
                                        name='studioMaxPrice'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                                <div>
                                    <label htmlFor='depositAmount' className='block mb-1 font-medium'>
                                        보증금
                                    </label>
                                    <input
                                        type='number'
                                        id='depositAmount'
                                        name='depositAmount'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor='introduction' className='block mb-1 font-medium'>
                                    소개글
                                </label>
                                <textarea
                                    id='introduction'
                                    name='introduction'
                                    rows={5}
                                    className='w-full border p-2 rounded-md'
                                ></textarea>
                            </div>
                            <div>
                                <label htmlFor='ownerPhoneNumber' className='block mb-1 font-medium'>
                                    소유주 전화번호
                                </label>
                                <input
                                    type='text'
                                    id='ownerPhoneNumber'
                                    name='ownerPhoneNumber'
                                    required
                                    className='w-full border p-2 rounded-md'
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* ... (주소 정보, 건물 정보 Fieldset은 기존과 동일하므로 생략) ... */}
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>주소 정보</legend>
                        <div className='space-y-4 p-2'>
                            <div className='flex gap-4 items-end'>
                                <div className='flex-1'>
                                    <label htmlFor='zipCode' className='block mb-1 font-medium'>
                                        우편번호
                                    </label>
                                    <input
                                        type='text'
                                        id='zipCode'
                                        name='addressInfo.zipCode'
                                        value={address.zipCode}
                                        readOnly
                                        required
                                        className='w-full border p-2 rounded-md bg-gray-100 cursor-not-allowed'
                                        placeholder='주소를 검색하세요'
                                    />
                                </div>
                                <button
                                    type='button'
                                    onClick={onClickAddressSearch}
                                    className='bg-blue-600 text-white px-4 py-2 rounded-md h-[42px] hover:bg-blue-700 whitespace-nowrap'
                                >
                                    주소 검색
                                </button>
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div>
                                    <label htmlFor='roadAddress' className='block mb-1 font-medium'>
                                        도로명 주소
                                    </label>
                                    <input
                                        type='text'
                                        id='roadAddress'
                                        name='addressInfo.roadAddress'
                                        value={address.roadAddress}
                                        readOnly
                                        required
                                        className='w-full border p-2 rounded-md bg-gray-100 cursor-not-allowed'
                                    />
                                </div>
                                <div>
                                    <label htmlFor='jibunAddress' className='block mb-1 font-medium'>
                                        지번 주소
                                    </label>
                                    <input
                                        type='text'
                                        id='jibunAddress'
                                        name='addressInfo.jibunAddress'
                                        value={address.jibunAddress}
                                        readOnly
                                        required
                                        className='w-full border p-2 rounded-md bg-gray-100 cursor-not-allowed'
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor='detailedAddress' className='block mb-1 font-medium'>
                                    상세 주소
                                </label>
                                <input
                                    type='text'
                                    id='detailedAddress'
                                    name='addressInfo.detailedAddress'
                                    value={address.detailedAddress}
                                    onChange={handleDetailAddressChange}
                                    required
                                    className='w-full border p-2 rounded-md'
                                    placeholder='상세 주소를 입력하세요'
                                />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>건물 정보</legend>
                        <div className='space-y-4 p-2'>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                <div>
                                    <label htmlFor='floorType' className='block mb-1 font-medium'>
                                        층 유형
                                    </label>
                                    <select
                                        id='floorType'
                                        name='buildingInfo.floorType'
                                        required
                                        className='w-full border p-2 rounded-md'
                                    >
                                        <option value=''>선택해주세요</option>
                                        {optionData.floorOptions.map((option) => (
                                            <option key={option.code} value={option.code}>
                                                {option.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor='floorNumber' className='block mb-1 font-medium'>
                                        층 수
                                    </label>
                                    <input
                                        type='number'
                                        id='floorNumber'
                                        name='buildingInfo.floorNumber'
                                        required
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                                <div>
                                    <label htmlFor='restroomType' className='block mb-1 font-medium'>
                                        화장실 유형
                                    </label>
                                    <select
                                        id='restroomType'
                                        name='buildingInfo.restroomType'
                                        required
                                        className='w-full border p-2 rounded-md'
                                    >
                                        <option value=''>선택해주세요</option>
                                        {optionData.restroomOptions.map((option) => (
                                            <option key={option.code} value={option.code}>
                                                {option.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                <div>
                                    <label className='block mb-1 font-medium'>주차 가능 여부</label>
                                    <div className='flex gap-4'>
                                        <label>
                                            <input
                                                type='radio'
                                                name='buildingInfo.isParkingAvailable'
                                                value='true'
                                                required
                                            />
                                            가능
                                        </label>
                                        <label>
                                            <input
                                                type='radio'
                                                name='buildingInfo.isParkingAvailable'
                                                value='false'
                                                required
                                            />{' '}
                                            불가능
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className='block mb-1 font-medium'>숙소 가능 여부</label>
                                    <div className='flex gap-4'>
                                        <label>
                                            <input
                                                type='radio'
                                                name='buildingInfo.isLodgingAvailable'
                                                value='true'
                                                required
                                            />{' '}
                                            가능
                                        </label>
                                        <label>
                                            <input
                                                type='radio'
                                                name='buildingInfo.isLodgingAvailable'
                                                value='false'
                                                required
                                            />{' '}
                                            불가능{' '}
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className='block mb-1 font-medium'>화재 보험 가입 여부</label>
                                    <div className='flex gap-4'>
                                        <label>
                                            <input
                                                type='radio'
                                                name='buildingInfo.hasFireInsurance'
                                                value='true'
                                                required
                                            />{' '}
                                            가입
                                        </label>
                                        <label>
                                            <input
                                                type='radio'
                                                name='buildingInfo.hasFireInsurance'
                                                value='false'
                                                required
                                            />{' '}
                                            미가입
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div>
                                    <label htmlFor='parkingFeeType' className='block mb-1 font-medium'>
                                        주차비 유형
                                    </label>
                                    <select
                                        id='parkingFeeType'
                                        name='buildingInfo.parkingFeeType'
                                        required
                                        className='w-full border p-2 rounded-md'
                                    >
                                        <option value=''>선택해주세요</option>
                                        {optionData.parkingFeeOptions.map((option) => (
                                            <option key={option.code} value={option.code}>
                                                {option.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor='parkingFeeInfo' className='block mb-1 font-medium'>
                                        주차비 정보
                                    </label>
                                    <input
                                        type='text'
                                        id='parkingFeeInfo'
                                        name='buildingInfo.parkingFeeInfo'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                <div>
                                    <label htmlFor='parkingSpots' className='block mb-1 font-medium'>
                                        주차 가능 대수
                                    </label>
                                    <input
                                        type='number'
                                        id='parkingSpots'
                                        name='buildingInfo.parkingSpots'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                                <div className='col-span-2'>
                                    <label htmlFor='parkingLocationName' className='block mb-1 font-medium'>
                                        주차장 이름
                                    </label>
                                    <input
                                        type='text'
                                        id='parkingLocationName'
                                        name='buildingInfo.parkingLocationName'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor='parkingLocationAddress' className='block mb-1 font-medium'>
                                    주차장 주소
                                </label>
                                <div className='flex gap-4'>
                                    <input
                                        type='text'
                                        id='parkingLocationAddress'
                                        name='buildingInfo.parkingLocationAddress'
                                        value={parkingAddress}
                                        readOnly
                                        className='w-full border p-2 rounded-md bg-gray-100 cursor-not-allowed'
                                        placeholder='주차장 주소를 검색하세요'
                                    />
                                    <button
                                        type='button'
                                        onClick={onClickParkingAddressSearch}
                                        className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 whitespace-nowrap'
                                    >
                                        주소 검색
                                    </button>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    {/* [수정] 인근 지하철역 선택 섹션 */}
                    <fieldset className='border p-4 rounded-md'>
                        <div className='flex justify-between items-center mb-4'>
                            <legend className='font-bold text-lg px-2'>
                                인근 지하철역 선택 ({stations.length} / 3)
                            </legend>
                            <button
                                type='button'
                                onClick={() => setStations([])}
                                className='text-xs text-gray-500 underline'
                            >
                                선택 초기화
                            </button>
                        </div>

                        <div className='mb-2 text-sm text-blue-600 px-2'>
                            * 주소를 검색하면 인근 역 목록이 나옵니다. 등록할 역을 클릭하여 선택해주세요. (최대 3개)
                        </div>

                        {/* 후보 목록 리스트 */}
                        <div id='nearby-stations-list' className='space-y-2 p-2 max-h-80 overflow-y-auto'>
                            {nearbyCandidates.length === 0 && (
                                <p className='text-gray-400 text-center py-4 bg-gray-50 rounded-md'>
                                    주소를 검색하면 인근 지하철역이 표시됩니다.
                                </p>
                            )}

                            {nearbyCandidates.map((candidate) => {
                                // 현재 역이 선택되었는지 확인
                                const isSelected = stations.some(
                                    (s) => s.subwayStationId === String(candidate.stationId)
                                );
                                const selectedStation = stations.find(
                                    (s) => s.subwayStationId === String(candidate.stationId)
                                );

                                return (
                                    <div
                                        key={candidate.stationId}
                                        onClick={() => handleToggleStation(candidate)}
                                        className={`
                                            border rounded-md p-3 cursor-pointer transition-all flex justify-between items-center
                                            ${
                                                isSelected
                                                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                    : 'border-gray-200 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <div className='flex-1'>
                                            <div className='flex items-center gap-2 mb-1'>
                                                {/* 체크박스 UI (선택됨 표시) */}
                                                <div
                                                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                                                        isSelected
                                                            ? 'bg-blue-600 border-blue-600'
                                                            : 'border-gray-300 bg-white'
                                                    }`}
                                                >
                                                    {isSelected && (
                                                        <span className='text-white text-xs font-bold'>✓</span>
                                                    )}
                                                </div>

                                                <h4 className='font-bold text-lg text-gray-800'>
                                                    {candidate.stationName}
                                                </h4>

                                                {/* 거리 표시 */}
                                                <span className='text-sm text-gray-500'>
                                                    (약 {candidate.distanceMeters}m)
                                                </span>
                                            </div>

                                            {/* 호선 정보 표시 */}
                                            <div className='flex gap-1 ml-7'>
                                                {candidate.lines.map((line, lIdx) => (
                                                    <span
                                                        key={lIdx}
                                                        className='text-[10px] text-white px-1.5 py-0.5 rounded-full'
                                                        style={{ backgroundColor: line.lineColor || '#999' }}
                                                    >
                                                        {line.lineName}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 선택된 경우 순위 표시 */}
                                        {isSelected && (
                                            <div className='text-blue-600 font-bold text-lg px-2'>
                                                {selectedStation?.sequence}순위
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </fieldset>

                    {/* ... (옵션, 금지악기 Fieldset은 기존과 동일하므로 생략) ... */}
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>스튜디오 공용 옵션</legend>
                        <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-2'>
                            {optionData.studioCommonOptions.map((option) => (
                                <label key={option.code} className='flex items-center gap-2'>
                                    <input type='checkbox' name='studioCommonOptionCodes' value={option.code} />
                                    {option.description}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2 mt-4'>스튜디오 개별 옵션</legend>
                        <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-2'>
                            {optionData.studioIndividualOptions.map((option) => (
                                <label key={option.code} className='flex items-center gap-2'>
                                    <input type='checkbox' name='studioIndividualOptionCodes' value={option.code} />
                                    {option.description}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>금지 악기</legend>
                        <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-2'>
                            {optionData.unavailableInstrumentOptions.map((option) => (
                                <label key={option.code} className='flex items-center gap-2'>
                                    <input type='checkbox' name='unavailableInstrumentCodes' value={option.code} />
                                    {option.description}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>룸 정보 (최소 1개)</legend>
                        <div id='rooms-list' className='space-y-4 p-2'>
                            {rooms.map((room, index) => (
                                <div key={index} className='border-dashed p-3 rounded-md space-y-2 relative'>
                                    <h4 className='font-semibold'>룸 {index + 1}</h4>
                                    <div>
                                        <label className='block mb-1 font-medium'>룸 이름</label>
                                        <input
                                            type='text'
                                            name={`rooms[${index}].roomName`}
                                            required
                                            className='w-full border p-2 rounded-md'
                                            value={room.roomName}
                                            onChange={(e) => handleRoomChange(index, 'roomName', e.target.value)}
                                        />
                                    </div>
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                        <div>
                                            <label className='block mb-1 font-medium'>사용 가능 여부</label>
                                            <div className='flex gap-4'>
                                                <label>
                                                    <input
                                                        type='radio'
                                                        name={`rooms[${index}].isAvailable`}
                                                        value='true'
                                                        checked={room.isAvailable === true}
                                                        onChange={() => handleRoomChange(index, 'isAvailable', true)}
                                                    />
                                                    가능
                                                </label>
                                                <label>
                                                    <input
                                                        type='radio'
                                                        name={`rooms[${index}].isAvailable`}
                                                        value='false'
                                                        checked={room.isAvailable === false}
                                                        onChange={() => handleRoomChange(index, 'isAvailable', false)}
                                                    />
                                                    불가능
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className='block mb-1 font-medium'>입주 가능 날짜</label>
                                            <input
                                                type='date'
                                                name={`rooms[${index}].availableAt`}
                                                className='w-full border p-2 rounded-md'
                                                value={room.availableAt}
                                                onChange={(e) => handleRoomChange(index, 'availableAt', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                        <div>
                                            <label className='block mb-1 font-medium'>가로 길이 (mm)</label>
                                            <input
                                                type='number'
                                                name={`rooms[${index}].widthMm`}
                                                className='w-full border p-2 rounded-md'
                                                value={room.widthMm}
                                                onChange={(e) => handleRoomChange(index, 'widthMm', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className='block mb-1 font-medium'>세로 길이 (mm)</label>
                                            <input
                                                type='number'
                                                name={`rooms[${index}].heightMm`}
                                                className='w-full border p-2 rounded-md'
                                                value={room.heightMm}
                                                onChange={(e) => handleRoomChange(index, 'heightMm', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className='block mb-1 font-medium'>기본 가격</label>
                                            <input
                                                type='number'
                                                name={`rooms[${index}].roomBasePrice`}
                                                required
                                                className='w-full border p-2 rounded-md'
                                                value={room.roomBasePrice}
                                                onChange={(e) =>
                                                    handleRoomChange(index, 'roomBasePrice', e.target.value)
                                                }
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type='button'
                                        onClick={() => removeRoom(index)}
                                        className='absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs'
                                    >
                                        삭제
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type='button'
                            onClick={addRoom}
                            className='mt-2 bg-gray-600 text-white px-4 py-2 rounded-md'
                        >
                            룸 추가
                        </button>
                    </fieldset>

                    {/* ... (이미지 정보 Fieldset, Submit 버튼 기존과 동일) ... */}
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>이미지 정보</legend>
                        <div className='p-2 space-y-4'>
                            <p className='text-sm text-gray-500'>
                                * 이미지는 등록 버튼을 누르면 일괄 업로드됩니다. 잘못 선택했다면 삭제 후 다시
                                선택해주세요.
                            </p>

                            {/* 1. 메인 이미지 */}
                            <div>
                                <label className='block mb-1 font-medium'>메인 이미지 (1~3개)</label>
                                <input
                                    type='file'
                                    multiple
                                    accept='image/*'
                                    className='w-full border p-2 rounded-md'
                                    onChange={(e) => handleFileSelect(e, 'mainImages')}
                                />
                                {/* 선택된 파일 목록 표시 */}
                                <div className='mt-2 space-y-1'>
                                    {selectedFiles.mainImages.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className='flex items-center justify-between bg-gray-50 p-2 rounded'
                                        >
                                            <span className='text-sm truncate'>{file.name}</span>
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('mainImages', idx)}
                                                className='text-red-500 text-xs font-bold px-2'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. 건물 이미지 */}
                            <div>
                                <label className='block mb-1 font-medium'>건물 이미지 (최대 4개)</label>
                                <input
                                    type='file'
                                    multiple
                                    accept='image/*'
                                    className='w-full border p-2 rounded-md'
                                    onChange={(e) => handleFileSelect(e, 'buildingImages')}
                                />
                                <div className='mt-2 space-y-1'>
                                    {selectedFiles.buildingImages.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className='flex items-center justify-between bg-gray-50 p-2 rounded'
                                        >
                                            <span className='text-sm truncate'>{file.name}</span>
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('buildingImages', idx)}
                                                className='text-red-500 text-xs font-bold px-2'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. 룸 이미지 */}
                            <div>
                                <label className='block mb-1 font-medium'>룸 이미지 (최대 20개)</label>
                                <input
                                    type='file'
                                    multiple
                                    accept='image/*'
                                    className='w-full border p-2 rounded-md'
                                    onChange={(e) => handleFileSelect(e, 'roomImages')}
                                />
                                <div className='mt-2 space-y-1'>
                                    {selectedFiles.roomImages.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className='flex items-center justify-between bg-gray-50 p-2 rounded'
                                        >
                                            <span className='text-sm truncate'>{file.name}</span>
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('roomImages', idx)}
                                                className='text-red-500 text-xs font-bold px-2'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 4. 도면 이미지 */}
                            <div>
                                <label className='block mb-1 font-medium'>도면 이미지 (필수 1개)</label>
                                <input
                                    type='file'
                                    accept='image/*'
                                    className='w-full border p-2 rounded-md'
                                    onChange={(e) => handleFileSelect(e, 'blueprintImage')}
                                />
                                {selectedFiles.blueprintImage && (
                                    <div className='mt-2 flex items-center justify-between bg-gray-50 p-2 rounded'>
                                        <span className='text-sm truncate'>{selectedFiles.blueprintImage.name}</span>
                                        <button
                                            type='button'
                                            onClick={() => removeSelectedFile('blueprintImage')}
                                            className='text-red-500 text-xs font-bold px-2'
                                        >
                                            X
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    <button
                        type='submit'
                        disabled={isSubmitting}
                        className={`w-full text-white p-3 rounded-md font-bold ${
                            isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isSubmitting ? '스튜디오 생성 중...' : '스튜디오 생성'}
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
