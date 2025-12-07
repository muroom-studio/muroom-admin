'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import OwnerRegisterModal from '@/components/OwnerRegisterModal';

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
    forbiddenInstrumentOptions: OptionItem[];
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

interface RoomInfo {
    roomName: string;
    isAvailable: boolean; // 기본값 처리를 위해 유지
    availableAt: string;
    widthMm: string;
    heightMm: string;
    roomBasePrice: string;
}

type StudioImageCategory = 'MAIN' | 'BUILDING' | 'ROOM' | 'BLUEPRINT' | 'COMMON_OPTION' | 'INDIVIDUAL_OPTION';

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
    const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
    const handleOwnerRegisterSuccess = (newPhoneNumber: string) => {
        // 기존 폼 데이터(FormData)를 직접 수정하긴 어려우니,
        // 전화번호를 State로 관리하거나, DOM에 직접 값을 넣어야 합니다.
        // 여기서는 가장 쉬운 방법: name="ownerPhoneNumber" 인 input을 찾아서 값 변경
        const phoneInput = document.querySelector('input[name="ownerPhoneNumber"]') as HTMLInputElement;
        if (phoneInput) {
            phoneInput.value = newPhoneNumber;
        }
    };

    const [rooms, setRooms] = useState<RoomInfo[]>([
        { roomName: '', isAvailable: true, availableAt: '', widthMm: '', heightMm: '', roomBasePrice: '' },
    ]);

    const [address, setAddress] = useState({
        zipCode: '',
        roadNameAddress: '',
        lotNumberAddress: '',
        detailedAddress: '',
    });

    const [parkingAddress, setParkingAddress] = useState('');

    // [수정] 토글 가능한 옵션들의 상태 통합 관리 (화장실, 숙소, 화재보험)
    const [toggleOptions, setToggleOptions] = useState<{
        hasRestroom: string | null;
        restroomLocation: string | null;
        restroomGender: string | null;
        isLodgingAvailable: string | null; // 'true' | 'false' | null
        hasFireInsurance: string | null; // 'true' | 'false' | null
    }>({
        hasRestroom: null,
        restroomLocation: null,
        restroomGender: null,
        isLodgingAvailable: null,
        hasFireInsurance: null,
    });

    const handleToggleOption = (key: keyof typeof toggleOptions, value: string) => {
        setToggleOptions((prev) => {
            const nextValue = prev[key] === value ? null : value; // 토글 로직

            // [로직 추가] 화장실 유무가 '있음(true)'이 아닌 상태로 변하면 -> 하위 상세 정보 초기화
            if (key === 'hasRestroom' && nextValue !== 'true') {
                return {
                    ...prev,
                    [key]: nextValue,
                    restroomLocation: null,
                    restroomGender: null,
                };
            }

            return {
                ...prev,
                [key]: nextValue,
            };
        });
    };

    const [selectedFiles, setSelectedFiles] = useState({
        mainImages: [] as File[],
        buildingImages: [] as File[],
        roomImages: [] as File[],
        blueprintImage: null as File | null,
        commonOptionImages: [] as File[],
        individualOptionImages: [] as File[],
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [optionData, setOptionData] = useState<OptionsFromApi>({
        floorOptions: [],
        restroomOptions: [],
        parkingFeeOptions: [],
        studioCommonOptions: [],
        studioIndividualOptions: [],
        forbiddenInstrumentOptions: [],
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
                }
            } catch (error) {
                console.error('옵션 로드 실패:', error);
            }
        };
        fetchOptions();
    }, []);

    // API 옵션 분류
    const restroomLocationOptions = optionData.restroomOptions.filter((opt) =>
        ['INTERNAL', 'EXTERNAL'].includes(opt.code)
    );
    const restroomGenderOptions = optionData.restroomOptions.filter((opt) => ['SEPARATE', 'UNISEX'].includes(opt.code));

    // --- Handlers: File ---
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, category: keyof typeof selectedFiles) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const fileList = Array.from(files);

        setSelectedFiles((prev) => {
            if (category === 'blueprintImage') {
                return { ...prev, [category]: fileList[0] };
            }
            return { ...prev, [category]: [...(prev[category] as File[]), ...fileList] };
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

    // --- Handlers: Room ---
    const addRoom = () => {
        setRooms([
            ...rooms,
            { roomName: '', isAvailable: true, availableAt: '', widthMm: '', heightMm: '', roomBasePrice: '' },
        ]);
    };

    const removeRoom = (index: number) => {
        if (rooms.length <= 1) return alert('최소 1개의 룸이 필요합니다.');
        const newRooms = rooms.filter((_, i) => i !== index);
        setRooms(newRooms);
    };

    const handleRoomChange = (index: number, field: keyof RoomInfo, value: string | boolean) => {
        const updatedRooms = [...rooms];
        updatedRooms[index] = { ...updatedRooms[index], [field]: value };
        setRooms(updatedRooms);
    };

    // --- Handlers: Subway ---
    const fetchNearbyStations = async (queryAddress: string) => {
        try {
            const encodedAddr = encodeURIComponent(queryAddress);
            const res = await fetch(`/api/v1/subway/nearby?address=${encodedAddr}`);
            if (!res.ok) return;

            const responseBody = await res.json();
            const data = (responseBody.data || responseBody) as NearbyStationsResponse;

            if (data.stations && data.stations.length > 0) {
                setNearbyCandidates(data.stations);
                setStations([]);
            } else {
                setNearbyCandidates([]);
                setStations([]);
            }
        } catch (error) {
            console.error('Subway fetch error:', error);
        }
    };

    const handleToggleStation = (info: StationInfo) => {
        const stationIdStr = String(info.stationId);
        const isAlreadySelected = stations.some((s) => s.subwayStationId === stationIdStr);

        if (isAlreadySelected) {
            setStations((prev) =>
                prev
                    .filter((s) => s.subwayStationId !== stationIdStr)
                    .map((s, index) => ({ ...s, sequence: String(index + 1) }))
            );
        } else {
            if (stations.length >= 3) return alert('지하철역은 최대 3개까지만 선택할 수 있습니다.');
            setStations((prev) => [
                ...prev,
                {
                    subwayStationId: stationIdStr,
                    sequence: String(prev.length + 1),
                    stationName: info.stationName,
                    distanceMeters: info.distanceMeters,
                    lines: info.lines,
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
                    zipCode: data.zonecode || '', // 혹시 모를 안전장치
                    // [수정] 값이 없으면 빈 문자열로 설정하여 에러 방지
                    roadNameAddress: data.roadAddress || '',
                    lotNumberAddress: data.jibunAddress || '',
                }));

                const targetAddress = data.roadAddress || data.jibunAddress || '';
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
                // [수정] 값이 없으면 빈 문자열 할당
                const fullAddress = data.roadAddress || data.jibunAddress || '';
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

        // 1. 필수값 유효성 검사
        if (selectedFiles.mainImages.length === 0) return alert('메인 이미지는 최소 1개 이상 필요합니다.');
        if (!selectedFiles.blueprintImage) return alert('도면 이미지는 필수입니다.');

        // [추가] 지하철역 최소 1개 필수
        if (stations.length === 0) return alert('인근 지하철역을 최소 1개 이상 선택해야 합니다.');

        // [추가] 룸 이름 필수 체크 (나머지 값은 선택)
        for (let i = 0; i < rooms.length; i++) {
            if (!rooms[i].roomName.trim()) {
                return alert(`${i + 1}번 룸의 이름을 입력해주세요.`);
            }
        }

        if (toggleOptions.hasRestroom === 'true') {
            if (!toggleOptions.restroomLocation && !toggleOptions.restroomGender) {
                return alert('화장실이 있다고 선택하셨습니다.\n화장실 위치나 남녀 구분 중 최소 하나는 선택해주세요.');
            }
        }

        if (!confirm('스튜디오를 생성하시겠습니까?')) return;

        setIsSubmitting(true);

        try {
            // 2. 파일 평탄화
            const allFiles: { file: File; category: StudioImageCategory }[] = [];
            selectedFiles.mainImages.forEach((f) => allFiles.push({ file: f, category: 'MAIN' }));
            selectedFiles.buildingImages.forEach((f) => allFiles.push({ file: f, category: 'BUILDING' }));
            selectedFiles.roomImages.forEach((f) => allFiles.push({ file: f, category: 'ROOM' }));
            if (selectedFiles.blueprintImage) {
                allFiles.push({ file: selectedFiles.blueprintImage, category: 'BLUEPRINT' });
            }
            selectedFiles.commonOptionImages.forEach((f) => allFiles.push({ file: f, category: 'COMMON_OPTION' }));
            selectedFiles.individualOptionImages.forEach((f) =>
                allFiles.push({ file: f, category: 'INDIVIDUAL_OPTION' })
            );

            // 3. Presigned URL 요청
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
                throw new Error(`이미지 업로드 URL 발급 실패: ${errorMsg}`);
            }

            const response = await presignRes.json();
            const presignedDataList = response.data?.presignedUrls as PresignedUrlResponse[];

            // 4. S3 업로드
            const uploadPromises = allFiles.map((item, index) => {
                const data = presignedDataList[index];
                if (!data || !data.url) throw new Error(`${index}번 파일 URL 없음`);
                return fetch(data.url, {
                    method: 'PUT',
                    body: item.file,
                    headers: { 'Content-Type': item.file.type },
                });
            });

            await Promise.all(uploadPromises);

            // 5. 키 분류
            const finalImageKeys = {
                mainImageKeys: [] as string[],
                buildingImageKeys: [] as string[],
                roomImageKeys: [] as string[],
                blueprintImageKey: '',
                commonOptionImageKeys: [] as string[],
                individualOptionImageKeys: [] as string[],
            };

            presignedDataList.forEach((data, index) => {
                const category = allFiles[index].category;
                const key = data.fileKey;
                if (category === 'MAIN') finalImageKeys.mainImageKeys.push(key);
                else if (category === 'BUILDING') finalImageKeys.buildingImageKeys.push(key);
                else if (category === 'ROOM') finalImageKeys.roomImageKeys.push(key);
                else if (category === 'BLUEPRINT') finalImageKeys.blueprintImageKey = key;
                else if (category === 'COMMON_OPTION') finalImageKeys.commonOptionImageKeys.push(key);
                else if (category === 'INDIVIDUAL_OPTION') finalImageKeys.individualOptionImageKeys.push(key);
            });

            // 6. 데이터 구성
            const formData = new FormData(e.target as HTMLFormElement);

            const commonOptionCodes = formData.getAll('studioCommonOptionCodes').map(String);
            const individualOptionCodes = formData.getAll('studioIndividualOptionCodes').map(String);
            const optionCodes = [...commonOptionCodes, ...individualOptionCodes];
            const studioCreatePayload = {
                studioName: formData.get('studioName'),
                studioMinPrice: Number(formData.get('studioMinPrice')) || null,
                studioMaxPrice: Number(formData.get('studioMaxPrice')) || null,
                depositAmount: Number(formData.get('depositAmount')) || null,
                introduction: formData.get('introduction') || null,
                ownerPhoneNumber: formData.get('ownerPhoneNumber'),

                addressInfo: address,

                buildingInfo: {
                    floorType: formData.get('buildingInfo.floorType'),
                    floorNumber: Number(formData.get('buildingInfo.floorNumber')),

                    // 토글 옵션은 State에서 직접 가져오기 (폼 데이터보다 확실함)
                    hasRestroom: toggleOptions.hasRestroom ? toggleOptions.hasRestroom === 'true' : null,
                    restroomLocation: toggleOptions.restroomLocation || null,
                    restroomGender: toggleOptions.restroomGender || null,

                    isLodgingAvailable: toggleOptions.isLodgingAvailable
                        ? toggleOptions.isLodgingAvailable === 'true'
                        : null,
                    hasFireInsurance: toggleOptions.hasFireInsurance ? toggleOptions.hasFireInsurance === 'true' : null,

                    // [수정] 주차 관련 필드는 선택 사항이므로 값 없으면 null/빈문자열 전송
                    parkingFeeType: formData.get('buildingInfo.parkingFeeType') || null,
                    parkingFeeInfo: formData.get('buildingInfo.parkingFeeInfo') || null,
                    parkingSpots: formData.get('buildingInfo.parkingSpots')
                        ? Number(formData.get('buildingInfo.parkingSpots'))
                        : null,
                    parkingLocationName: formData.get('buildingInfo.parkingLocationName') || null,
                    parkingLocationAddress: parkingAddress || null,
                },

                nearbyStations: stations,

                // 옵션은 선택 안 하면 빈 배열로 전송됨
                optionCodes: optionCodes,
                forbiddenInstrumentCodes: formData.getAll('forbiddenInstrumentCodes'),

                // [수정] 룸 정보: 빈 숫자 필드는 null 처리
                rooms: rooms.map((room) => ({
                    ...room,
                    widthMm: room.widthMm ? Number(room.widthMm) : null,
                    heightMm: room.heightMm ? Number(room.heightMm) : null,
                    roomBasePrice: room.roomBasePrice ? Number(room.roomBasePrice) : null,
                    // 날짜 등은 빈 문자열 그대로 전송 (백엔드 처리 필요 시 수정)
                })),

                imageKeys: finalImageKeys,
            };

            // 7. 생성 요청
            const createRes = await fetch(`/api/admin/studios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studioCreatePayload),
            });

            if (!createRes.ok) {
                const errorText = await createRes.text();
                throw new Error(errorText);
            }

            alert('스튜디오가 성공적으로 생성되었습니다.');
            router.push('/');
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
                    {/* 기본 정보 */}
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>기본 정보</legend>
                        <div className='space-y-4 p-2'>
                            <div>
                                <label htmlFor='studioName' className='block mb-1 font-medium'>
                                    스튜디오 이름 <span className='text-red-500'>*</span>
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
                                {/* 가격, 보증금 등 필수 해제 */}
                                <div>
                                    <label className='block mb-1 font-medium'>최소 가격</label>
                                    <input
                                        type='number'
                                        name='studioMinPrice'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                                <div>
                                    <label className='block mb-1 font-medium'>최대 가격</label>
                                    <input
                                        type='number'
                                        name='studioMaxPrice'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                                <div>
                                    <label className='block mb-1 font-medium'>보증금</label>
                                    <input
                                        type='number'
                                        name='depositAmount'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                            </div>
                            <div>
                                <label className='block mb-1 font-medium'>소개글</label>
                                <textarea
                                    name='introduction'
                                    rows={5}
                                    className='w-full border p-2 rounded-md'
                                ></textarea>
                            </div>
                            <div>
                                <label className='block mb-1 font-medium'>
                                    소유주 전화번호 <span className='text-red-500'>*</span>
                                </label>
                                <div className='flex gap-2'>
                                    <input
                                        type='text'
                                        name='ownerPhoneNumber'
                                        required
                                        className='flex-1 border p-2 rounded-md'
                                        placeholder='등록된 사장님 전화번호 입력'
                                    />
                                    <button
                                        type='button'
                                        onClick={() => setIsOwnerModalOpen(true)}
                                        className='bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 whitespace-nowrap'
                                    >
                                        + 신규 사장님 등록
                                    </button>
                                </div>
                                <p className='text-xs text-gray-500 mt-1'>
                                    * 이미 등록된 사장님이면 전화번호를 입력하고, 없으면 신규 등록 버튼을 눌러주세요.
                                </p>
                            </div>
                        </div>
                    </fieldset>

                    {/* 주소 정보 (필수) */}
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>
                            주소 정보 <span className='text-red-500'>*</span>
                        </legend>
                        {/* ... 기존 주소 입력 UI (변경 없음) ... */}
                        <div className='space-y-4 p-2'>
                            <div className='flex gap-4 items-end'>
                                <div className='flex-1'>
                                    <label className='block mb-1 font-medium'>우편번호</label>
                                    <input
                                        type='text'
                                        name='addressInfo.zipCode'
                                        value={address.zipCode}
                                        readOnly
                                        required
                                        className='w-full border p-2 rounded-md bg-gray-100'
                                    />
                                </div>
                                <button
                                    type='button'
                                    onClick={onClickAddressSearch}
                                    className='bg-blue-600 text-white px-4 py-2 rounded-md'
                                >
                                    주소 검색
                                </button>
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <input
                                    type='text'
                                    value={address.roadNameAddress}
                                    readOnly
                                    required
                                    className='w-full border p-2 rounded-md bg-gray-100'
                                />
                                <input
                                    type='text'
                                    value={address.lotNumberAddress}
                                    readOnly
                                    required
                                    className='w-full border p-2 rounded-md bg-gray-100'
                                />
                            </div>
                            <input
                                type='text'
                                value={address.detailedAddress}
                                onChange={handleDetailAddressChange}
                                required
                                className='w-full border p-2 rounded-md'
                                placeholder='상세 주소'
                            />
                        </div>

                        <br />

                        <div className='flex justify-between items-center mb-4'>
                            <legend className='font-bold text-lg px-2'>
                                인근 지하철역 선택 <span className='text-red-500'>*</span> ({stations.length} / 3)
                            </legend>
                            <button
                                type='button'
                                onClick={() => setStations([])}
                                className='text-xs text-gray-500 underline'
                            >
                                초기화
                            </button>
                        </div>
                        {/* ... 후보 리스트 렌더링 부분 동일 ... */}
                        <div id='nearby-stations-list' className='space-y-2 p-2 max-h-80 overflow-y-auto'>
                            {nearbyCandidates.length === 0 && (
                                <p className='text-gray-400 text-center py-4 bg-gray-50 rounded-md'>
                                    주소를 검색하면 인근 역이 표시됩니다.
                                </p>
                            )}
                            {nearbyCandidates.map((candidate) => {
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
                                        className={`border rounded-md p-3 cursor-pointer flex justify-between items-center ${
                                            isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <div>
                                            <div className='flex items-center gap-2'>
                                                <span className='font-bold'>{candidate.stationName}</span>{' '}
                                                <span className='text-sm text-gray-500'>
                                                    {candidate.distanceMeters}m
                                                </span>
                                            </div>
                                            <div className='flex gap-1 mt-1'>
                                                {candidate.lines.map((l, i) => (
                                                    <span
                                                        key={i}
                                                        className='text-[10px] text-white px-1.5 rounded'
                                                        style={{ background: l.lineColor }}
                                                    >
                                                        {l.lineName}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <span className='text-blue-600 font-bold'>
                                                {selectedStation?.sequence}순위
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </fieldset>

                    {/* 건물 정보 */}
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>건물 정보</legend>
                        <div className='space-y-4 p-2'>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                <div>
                                    <label className='block mb-1 font-medium'>
                                        층 유형 <span className='text-red-500'>*</span>
                                    </label>
                                    <select
                                        name='buildingInfo.floorType'
                                        required
                                        className='w-full border p-2 rounded-md'
                                    >
                                        <option value=''>선택</option>
                                        {optionData.floorOptions.map((opt) => (
                                            <option key={opt.code} value={opt.code}>
                                                {opt.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className='block mb-1 font-medium'>
                                        층 수 <span className='text-red-500'>*</span>
                                    </label>
                                    <input
                                        type='number'
                                        name='buildingInfo.floorNumber'
                                        required
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                            </div>

                            {/* 화장실 위치 (토글) */}
                            <div className='bg-gray-50 p-3 rounded-md border border-gray-200'>
                                <label className='block mb-2 font-bold text-gray-800'>
                                    화장실 유무
                                    {toggleOptions.hasRestroom && (
                                        <button
                                            type='button'
                                            onClick={() => handleToggleOption('hasRestroom', '')}
                                            className='ml-2 text-xs text-gray-400 underline hover:text-red-500'
                                        >
                                            선택 초기화
                                        </button>
                                    )}
                                </label>
                                <div className='flex gap-6 h-8 items-center mb-2'>
                                    <label className='flex items-center gap-2 cursor-pointer'>
                                        <input
                                            type='radio'
                                            name='buildingInfo.hasRestroom'
                                            value='true'
                                            checked={toggleOptions.hasRestroom === 'true'}
                                            onClick={() => handleToggleOption('hasRestroom', 'true')}
                                            onChange={() => {}}
                                        />
                                        있음
                                    </label>
                                    <label className='flex items-center gap-2 cursor-pointer'>
                                        <input
                                            type='radio'
                                            name='buildingInfo.hasRestroom'
                                            value='false'
                                            checked={toggleOptions.hasRestroom === 'false'}
                                            onClick={() => handleToggleOption('hasRestroom', 'false')}
                                            onChange={() => {}}
                                        />
                                        없음
                                    </label>
                                </div>

                                {/* [조건부 렌더링] 화장실이 '있음'일 때만 상세 옵션 노출 */}
                                {toggleOptions.hasRestroom === 'true' && (
                                    <div className='pl-4 border-l-2 border-blue-200 space-y-3 mt-3'>
                                        {/* 1-1. 화장실 위치 */}
                                        <div>
                                            <label className='block mb-1 font-medium text-sm text-gray-600'>
                                                화장실 위치 <span className='text-red-500 text-xs'>(필수)</span>
                                                {toggleOptions.restroomLocation && (
                                                    <button
                                                        type='button'
                                                        onClick={() => handleToggleOption('restroomLocation', '')}
                                                        className='ml-2 text-xs text-gray-400 underline'
                                                    >
                                                        초기화
                                                    </button>
                                                )}
                                            </label>
                                            <div className='flex gap-4 items-center'>
                                                {restroomLocationOptions.length > 0 ? (
                                                    restroomLocationOptions.map((opt) => (
                                                        <label
                                                            key={opt.code}
                                                            className='flex items-center gap-2 cursor-pointer text-sm'
                                                        >
                                                            <input
                                                                type='radio'
                                                                name='buildingInfo.restroomLocation'
                                                                value={opt.code}
                                                                checked={toggleOptions.restroomLocation === opt.code}
                                                                onClick={() =>
                                                                    handleToggleOption('restroomLocation', opt.code)
                                                                }
                                                                onChange={() => {}}
                                                            />
                                                            {opt.description}
                                                        </label>
                                                    ))
                                                ) : (
                                                    <span className='text-sm text-gray-400'>로딩 중...</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 1-2. 화장실 남녀 구분 */}
                                        <div>
                                            <label className='block mb-1 font-medium text-sm text-gray-600'>
                                                화장실 남녀 구분 <span className='text-red-500 text-xs'>(필수)</span>
                                                {toggleOptions.restroomGender && (
                                                    <button
                                                        type='button'
                                                        onClick={() => handleToggleOption('restroomGender', '')}
                                                        className='ml-2 text-xs text-gray-400 underline'
                                                    >
                                                        초기화
                                                    </button>
                                                )}
                                            </label>
                                            <div className='flex gap-4 items-center'>
                                                {restroomGenderOptions.length > 0 ? (
                                                    restroomGenderOptions.map((opt) => (
                                                        <label
                                                            key={opt.code}
                                                            className='flex items-center gap-2 cursor-pointer text-sm'
                                                        >
                                                            <input
                                                                type='radio'
                                                                name='buildingInfo.restroomGender'
                                                                value={opt.code}
                                                                checked={toggleOptions.restroomGender === opt.code}
                                                                onClick={() =>
                                                                    handleToggleOption('restroomGender', opt.code)
                                                                }
                                                                onChange={() => {}}
                                                            />
                                                            {opt.description}
                                                        </label>
                                                    ))
                                                ) : (
                                                    <span className='text-sm text-gray-400'>로딩 중...</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* [수정] 숙소 및 화재보험 (토글 가능, 선택사항) */}
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div>
                                    <label className='block mb-1 font-medium'>
                                        숙소 가능 여부
                                        {toggleOptions.isLodgingAvailable && (
                                            <button
                                                type='button'
                                                onClick={() => handleToggleOption('isLodgingAvailable', '')}
                                                className='ml-2 text-xs text-gray-400 underline'
                                            >
                                                초기화
                                            </button>
                                        )}
                                    </label>
                                    <div className='flex gap-4 h-[42px] items-center'>
                                        <label className='flex items-center gap-2'>
                                            <input
                                                type='radio'
                                                name='buildingInfo.isLodgingAvailable'
                                                value='true'
                                                checked={toggleOptions.isLodgingAvailable === 'true'}
                                                onClick={() => handleToggleOption('isLodgingAvailable', 'true')}
                                                onChange={() => {}}
                                            />{' '}
                                            가능
                                        </label>
                                        <label className='flex items-center gap-2'>
                                            <input
                                                type='radio'
                                                name='buildingInfo.isLodgingAvailable'
                                                value='false'
                                                checked={toggleOptions.isLodgingAvailable === 'false'}
                                                onClick={() => handleToggleOption('isLodgingAvailable', 'false')}
                                                onChange={() => {}}
                                            />{' '}
                                            불가능
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className='block mb-1 font-medium'>
                                        화재 보험 가입 여부
                                        {toggleOptions.hasFireInsurance && (
                                            <button
                                                type='button'
                                                onClick={() => handleToggleOption('hasFireInsurance', '')}
                                                className='ml-2 text-xs text-gray-400 underline'
                                            >
                                                초기화
                                            </button>
                                        )}
                                    </label>
                                    <div className='flex gap-4 h-[42px] items-center'>
                                        <label className='flex items-center gap-2'>
                                            <input
                                                type='radio'
                                                name='buildingInfo.hasFireInsurance'
                                                value='true'
                                                checked={toggleOptions.hasFireInsurance === 'true'}
                                                onClick={() => handleToggleOption('hasFireInsurance', 'true')}
                                                onChange={() => {}}
                                            />{' '}
                                            가입
                                        </label>
                                        <label className='flex items-center gap-2'>
                                            <input
                                                type='radio'
                                                name='buildingInfo.hasFireInsurance'
                                                value='false'
                                                checked={toggleOptions.hasFireInsurance === 'false'}
                                                onClick={() => handleToggleOption('hasFireInsurance', 'false')}
                                                onChange={() => {}}
                                            />{' '}
                                            미가입
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* [수정] 주차 정보 (필수 아님, 주차 가능 여부 삭제) */}
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div>
                                    <label className='block mb-1 font-medium'>주차비 유형</label>
                                    <select name='buildingInfo.parkingFeeType' className='w-full border p-2 rounded-md'>
                                        <option value=''>선택 (주차 불가 포함)</option>
                                        {optionData.parkingFeeOptions.map((opt) => (
                                            <option key={opt.code} value={opt.code}>
                                                {opt.description}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className='block mb-1 font-medium'>주차비 정보</label>
                                    <input
                                        type='text'
                                        name='buildingInfo.parkingFeeInfo'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                            </div>
                            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                                <div>
                                    <label className='block mb-1 font-medium'>주차 가능 대수</label>
                                    <input
                                        type='number'
                                        name='buildingInfo.parkingSpots'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                                <div className='col-span-2'>
                                    <label className='block mb-1 font-medium'>주차장 이름</label>
                                    <input
                                        type='text'
                                        name='buildingInfo.parkingLocationName'
                                        className='w-full border p-2 rounded-md'
                                    />
                                </div>
                            </div>
                            <div>
                                <label className='block mb-1 font-medium'>주차장 주소</label>
                                <div className='flex gap-4'>
                                    <input
                                        type='text'
                                        value={parkingAddress}
                                        readOnly
                                        className='w-full border p-2 rounded-md bg-gray-100'
                                        placeholder='주차장 주소 검색'
                                    />
                                    <button
                                        type='button'
                                        onClick={onClickParkingAddressSearch}
                                        className='bg-blue-600 text-white px-4 py-2 rounded-md whitespace-nowrap'
                                    >
                                        검색
                                    </button>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    {/* 옵션 (선택) */}
                    {/* ... (옵션, 금지악기 UI 기존과 동일 - 모두 선택 사항) ... */}
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>스튜디오 공용 옵션</legend>
                        <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-2'>
                            {optionData.studioCommonOptions.map((opt) => (
                                <label key={opt.code} className='flex gap-2'>
                                    <input type='checkbox' name='studioCommonOptionCodes' value={opt.code} />
                                    {opt.description}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>스튜디오 개별 옵션</legend>
                        <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-2'>
                            {optionData.studioIndividualOptions.map((opt) => (
                                <label key={opt.code} className='flex gap-2'>
                                    <input type='checkbox' name='studioIndividualOptionCodes' value={opt.code} />
                                    {opt.description}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>금지 악기</legend>
                        <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-2'>
                            {optionData.forbiddenInstrumentOptions.map((opt) => (
                                <label key={opt.code} className='flex gap-2'>
                                    <input type='checkbox' name='forbiddenInstrumentCodes' value={opt.code} />
                                    {opt.description}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {/* 룸 정보 (최소 1개, 이름만 필수) */}
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>
                            룸 정보 <span className='text-red-500'>*</span>
                        </legend>
                        <div className='space-y-4 p-2'>
                            {rooms.map((room, index) => (
                                <div key={index} className='border-dashed p-3 rounded-md space-y-2 relative'>
                                    <h4 className='font-semibold'>룸 {index + 1}</h4>
                                    <div>
                                        <label className='block mb-1 font-medium'>
                                            룸 이름 <span className='text-red-500'>*</span>
                                        </label>
                                        <input
                                            type='text'
                                            value={room.roomName}
                                            onChange={(e) => handleRoomChange(index, 'roomName', e.target.value)}
                                            required
                                            className='w-full border p-2 rounded-md'
                                        />
                                    </div>
                                    {/* 나머지 필드는 required 제거됨 */}
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                        <div>
                                            <label className='block mb-1 font-medium'>사용 가능 여부</label>
                                            <div className='flex gap-4'>
                                                <label>
                                                    <input
                                                        type='radio'
                                                        checked={room.isAvailable}
                                                        onChange={() => handleRoomChange(index, 'isAvailable', true)}
                                                    />{' '}
                                                    가능
                                                </label>
                                                <label>
                                                    <input
                                                        type='radio'
                                                        checked={!room.isAvailable}
                                                        onChange={() => handleRoomChange(index, 'isAvailable', false)}
                                                    />{' '}
                                                    불가능
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className='block mb-1 font-medium'>입주 가능일</label>
                                            <input
                                                type='date'
                                                value={room.availableAt}
                                                onChange={(e) => handleRoomChange(index, 'availableAt', e.target.value)}
                                                className='w-full border p-2 rounded-md'
                                            />
                                        </div>
                                    </div>
                                    <div className='grid grid-cols-3 gap-4'>
                                        <div>
                                            <label className='block mb-1 font-medium'>가로(mm)</label>
                                            <input
                                                type='number'
                                                value={room.widthMm}
                                                onChange={(e) => handleRoomChange(index, 'widthMm', e.target.value)}
                                                className='w-full border p-2 rounded-md'
                                            />
                                        </div>
                                        <div>
                                            <label className='block mb-1 font-medium'>세로(mm)</label>
                                            <input
                                                type='number'
                                                value={room.heightMm}
                                                onChange={(e) => handleRoomChange(index, 'heightMm', e.target.value)}
                                                className='w-full border p-2 rounded-md'
                                            />
                                        </div>
                                        <div>
                                            <label className='block mb-1 font-medium'>기본 가격</label>
                                            <input
                                                type='number'
                                                value={room.roomBasePrice}
                                                onChange={(e) =>
                                                    handleRoomChange(index, 'roomBasePrice', e.target.value)
                                                }
                                                className='w-full border p-2 rounded-md'
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type='button'
                                        onClick={() => removeRoom(index)}
                                        className='absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs'
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

                    {/* 이미지 정보 (메인/도면 필수) */}
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>이미지 정보</legend>
                        <div className='p-2 space-y-4'>
                            <div>
                                <label className='block mb-1 font-medium'>
                                    메인 이미지 (필수) <span className='text-red-500'>*</span>
                                </label>
                                <input
                                    type='file'
                                    multiple
                                    accept='image/*'
                                    onChange={(e) => handleFileSelect(e, 'mainImages')}
                                    className='w-full border p-2 rounded-md'
                                />
                                <div className='mt-1 space-y-1'>
                                    {selectedFiles.mainImages.map((f, i) => (
                                        <div key={i} className='flex justify-between bg-gray-50 p-1 text-sm'>
                                            {f.name}{' '}
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('mainImages', i)}
                                                className='text-red-500'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* 건물, 룸, 옵션 이미지는 선택사항 */}
                            <div>
                                <label className='block mb-1 font-medium'>건물 이미지</label>
                                <input
                                    type='file'
                                    multiple
                                    accept='image/*'
                                    onChange={(e) => handleFileSelect(e, 'buildingImages')}
                                    className='w-full border p-2 rounded-md'
                                />
                                <div className='mt-1 space-y-1'>
                                    {selectedFiles.buildingImages.map((f, i) => (
                                        <div key={i} className='flex justify-between bg-gray-50 p-1 text-sm'>
                                            {f.name}{' '}
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('buildingImages', i)}
                                                className='text-red-500'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className='block mb-1 font-medium'>룸 이미지</label>
                                <input
                                    type='file'
                                    multiple
                                    accept='image/*'
                                    onChange={(e) => handleFileSelect(e, 'roomImages')}
                                    className='w-full border p-2 rounded-md'
                                />
                                <div className='mt-1 space-y-1'>
                                    {selectedFiles.roomImages.map((f, i) => (
                                        <div key={i} className='flex justify-between bg-gray-50 p-1 text-sm'>
                                            {f.name}{' '}
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('roomImages', i)}
                                                className='text-red-500'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className='block mb-1 font-medium'>
                                    도면 이미지 (필수) <span className='text-red-500'>*</span>
                                </label>
                                <input
                                    type='file'
                                    accept='image/*'
                                    onChange={(e) => handleFileSelect(e, 'blueprintImage')}
                                    className='w-full border p-2 rounded-md'
                                />
                                {selectedFiles.blueprintImage && (
                                    <div className='mt-1 flex justify-between bg-gray-50 p-1 text-sm'>
                                        {selectedFiles.blueprintImage.name}{' '}
                                        <button
                                            type='button'
                                            onClick={() => removeSelectedFile('blueprintImage')}
                                            className='text-red-500'
                                        >
                                            X
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className='block mb-1 font-medium'>공용 옵션 이미지</label>
                                <input
                                    type='file'
                                    multiple
                                    accept='image/*'
                                    onChange={(e) => handleFileSelect(e, 'commonOptionImages')}
                                    className='w-full border p-2 rounded-md'
                                />
                                <div className='mt-1 space-y-1'>
                                    {selectedFiles.commonOptionImages.map((f, i) => (
                                        <div key={i} className='flex justify-between bg-gray-50 p-1 text-sm'>
                                            {f.name}{' '}
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('commonOptionImages', i)}
                                                className='text-red-500'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className='block mb-1 font-medium'>개별 옵션 이미지</label>
                                <input
                                    type='file'
                                    multiple
                                    accept='image/*'
                                    onChange={(e) => handleFileSelect(e, 'individualOptionImages')}
                                    className='w-full border p-2 rounded-md'
                                />
                                <div className='mt-1 space-y-1'>
                                    {selectedFiles.individualOptionImages.map((f, i) => (
                                        <div key={i} className='flex justify-between bg-gray-50 p-1 text-sm'>
                                            {f.name}{' '}
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('individualOptionImages', i)}
                                                className='text-red-500'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <button
                        type='submit'
                        disabled={isSubmitting}
                        className={`w-full text-white p-3 rounded-md font-bold ${
                            isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isSubmitting ? '스튜디오 생성 중...' : '스튜디오 생성'}
                    </button>
                </form>
            </main>

            <OwnerRegisterModal
                isOpen={isOwnerModalOpen}
                onClose={() => setIsOwnerModalOpen(false)}
                onSuccess={handleOwnerRegisterSuccess}
            />

            <button
                type='button'
                onClick={() => router.push('/')}
                className='mt-4 text-gray-700 p-3 rounded-md border hover:bg-gray-100'
            >
                홈으로 돌아가기
            </button>
        </div>
    );
}
