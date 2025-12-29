'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import OwnerRegisterModal from '@/components/OwnerRegisterModal';
import NumberInput from '@/components/NumberInput';

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
    isAvailable: boolean | null;
    availableAt: string;
    widthMm: string;
    heightMm: string;
    roomBasePrice: string;
}

// 백엔드 Enum과 일치
type StudioImageCategory = 'MAIN' | 'BUILDING' | 'ROOM' | 'BLUEPRINT' | 'COMMON_OPTION' | 'INDIVIDUAL_OPTION';

// [추가] 업로드된 이미지 상태 관리를 위한 인터페이스
interface UploadedImage {
    id: string; // 고유 식별자 (삭제 시 사용)
    file: File; // 원본 파일 객체 (미리보기 및 이름 표시용)
    s3Key: string | null; // 업로드 성공 시 저장될 S3 Key
    isUploading: boolean; // 로딩 상태 표시용
}

interface PresignedUrlResponse {
    status: number;
    message: string;
    data: {
        presignedPutUrl: string;
        fileKey: string;
    };
}

// --- Main Component ---

export default function NewStudioPage() {
    const router = useRouter();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

    const [stations, setStations] = useState<Station[]>([]);
    const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

    const handleOwnerRegisterSuccess = (newPhoneNumber: string) => {
        const phoneInput = document.querySelector('input[name="ownerPhoneNumber"]') as HTMLInputElement;
        if (phoneInput) {
            phoneInput.value = newPhoneNumber;
        }
    };

    const [rooms, setRooms] = useState<RoomInfo[]>([
        { roomName: '', isAvailable: null, availableAt: '', widthMm: '', heightMm: '', roomBasePrice: '' },
    ]);

    const [address, setAddress] = useState({
        zipCode: '',
        roadNameAddress: '',
        lotNumberAddress: '',
        detailedAddress: '',
    });

    const [parkingAddress, setParkingAddress] = useState('');

    const [toggleOptions, setToggleOptions] = useState<{
        hasRestroom: string | null;
        restroomLocation: string | null;
        restroomGender: string | null;
        isLodgingAvailable: string | null;
        hasFireInsurance: string | null;
    }>({
        hasRestroom: null,
        restroomLocation: null,
        restroomGender: null,
        isLodgingAvailable: null,
        hasFireInsurance: null,
    });

    const handleToggleOption = (key: keyof typeof toggleOptions, value: string) => {
        setToggleOptions((prev) => {
            const nextValue = prev[key] === value ? null : value;
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

    // [수정] 파일 상태 관리 (기존 File[] -> UploadedImage[])
    const [imageState, setImageState] = useState({
        mainImages: [] as UploadedImage[],
        buildingImages: [] as UploadedImage[],
        roomImages: [] as UploadedImage[],
        blueprintImage: null as UploadedImage | null, // 단일 파일
        commonOptionImages: [] as UploadedImage[],
        individualOptionImages: [] as UploadedImage[],
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
                const response = await fetch(`${API_BASE_URL}/api/v1/studios/filter-options`);
                const responseBody = await response.json();
                if (response.ok && responseBody.data) {
                    setOptionData(responseBody.data);
                }
            } catch (error) {
                console.error('옵션 로드 실패:', error);
            }
        };
        fetchOptions();
    }, [API_BASE_URL]);

    const restroomLocationOptions = optionData.restroomOptions.filter((opt) =>
        ['INTERNAL', 'EXTERNAL'].includes(opt.code)
    );
    const restroomGenderOptions = optionData.restroomOptions.filter((opt) => ['SEPARATE', 'UNISEX'].includes(opt.code));

    // --- [핵심] 1. 단일 파일 업로드 함수 (Presigned URL -> S3 PUT) ---
    const uploadFileToS3 = async (file: File, category: StudioImageCategory): Promise<string> => {
        // 1. Presigned URL 요청
        const presignPayload = {
            fileName: file.name,
            category: category,
            contentType: file.type,
        };

        const presignRes = await fetch(`${API_BASE_URL}/api/admin/studios/presigned-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(presignPayload),
        });

        if (!presignRes.ok) {
            const errorText = await presignRes.text();
            throw new Error(`URL 발급 실패: ${errorText}`);
        }

        const responseBody: PresignedUrlResponse = await presignRes.json();
        const { presignedPutUrl, fileKey } = responseBody.data;

        // 2. S3 직접 업로드 (PUT)
        const s3Res = await fetch(presignedPutUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
        });

        if (!s3Res.ok) {
            throw new Error('S3 업로드 실패');
        }

        return fileKey;
    };

    // --- [핵심] 2. 파일 선택 핸들러 (즉시 업로드 수행) ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, category: keyof typeof imageState) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const fileList = Array.from(files);

        // State에 '업로드 중(isUploading: true)' 상태로 먼저 추가
        const newImages: UploadedImage[] = fileList.map((file) => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            s3Key: null,
            isUploading: true,
        }));

        // 단일 파일인 경우 교체, 다중 파일인 경우 기존 목록에 추가
        if (category === 'blueprintImage') {
            setImageState((prev) => ({ ...prev, [category]: newImages[0] }));
        } else {
            setImageState((prev) => ({
                ...prev,
                [category]: [...(prev[category] as UploadedImage[]), ...newImages],
            }));
        }

        // 실제 업로드 수행 (병렬 처리)
        for (const imgWrapper of newImages) {
            try {
                // API 호출 시 백엔드 Enum에 맞는 대문자 카테고리 전달
                const apiCategory =
                    category === 'mainImages'
                        ? 'MAIN'
                        : category === 'buildingImages'
                        ? 'BUILDING'
                        : category === 'roomImages'
                        ? 'ROOM'
                        : category === 'blueprintImage'
                        ? 'BLUEPRINT'
                        : category === 'commonOptionImages'
                        ? 'COMMON_OPTION'
                        : 'INDIVIDUAL_OPTION';

                const key = await uploadFileToS3(imgWrapper.file, apiCategory);

                // 업로드 성공 시 State 업데이트 (Key 저장, 로딩 해제)
                setImageState((prev) => {
                    if (category === 'blueprintImage') {
                        // 단일 파일 업데이트
                        const current = prev[category] as UploadedImage;
                        if (current?.id === imgWrapper.id) {
                            return { ...prev, [category]: { ...current, s3Key: key, isUploading: false } };
                        }
                        return prev;
                    } else {
                        // 배열 내 해당 아이템 업데이트
                        const list = prev[category] as UploadedImage[];
                        return {
                            ...prev,
                            [category]: list.map((item) =>
                                item.id === imgWrapper.id ? { ...item, s3Key: key, isUploading: false } : item
                            ),
                        };
                    }
                });
            } catch (error) {
                console.error(`파일 업로드 실패 (${imgWrapper.file.name}):`, error);
                alert(`"${imgWrapper.file.name}" 업로드에 실패했습니다.`);

                // 실패 시 목록에서 제거
                removeSelectedFile(category, imgWrapper.id);
            }
        }

        e.target.value = ''; // Input 초기화 (동일 파일 재선택 가능하게)
    };

    // [수정] 파일 삭제 핸들러 (ID 기준 삭제)
    const removeSelectedFile = (category: keyof typeof imageState, idToRemove: string) => {
        setImageState((prev) => {
            if (category === 'blueprintImage') {
                return { ...prev, [category]: null };
            }
            return {
                ...prev,
                [category]: (prev[category] as UploadedImage[]).filter((item) => item.id !== idToRemove),
            };
        });
    };

    // --- Handlers: Room ---
    const addRoom = () => {
        setRooms([
            ...rooms,
            { roomName: '', isAvailable: null, availableAt: '', widthMm: '', heightMm: '', roomBasePrice: '' },
        ]);
    };

    const removeRoom = (index: number) => {
        if (rooms.length <= 1) return alert('최소 1개의 룸이 필요합니다.');
        const newRooms = rooms.filter((_, i) => i !== index);
        setRooms(newRooms);
    };

    const handleRoomChange = (index: number, field: keyof RoomInfo, value: string | boolean | null) => {
        const updatedRooms = [...rooms];
        // @ts-expect-error: dynamic key assignment
        updatedRooms[index] = { ...updatedRooms[index], [field]: value };
        setRooms(updatedRooms);
    };

    // --- Handlers: Subway ---
    const fetchNearbyStations = async (queryAddress: string) => {
        try {
            const encodedAddr = encodeURIComponent(queryAddress);
            const res = await fetch(`${API_BASE_URL}/api/v1/subway/nearby?address=${encodedAddr}`);
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
                    zipCode: data.zonecode || '',
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
                const fullAddress = data.roadAddress || data.jibunAddress || '';
                setParkingAddress(fullAddress);
            },
        }).open();
    };

    const handleDetailAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress({ ...address, detailedAddress: e.target.value });
    };

    // --- Handlers: Submit (최종 등록) ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. 필수값 유효성 검사
        if (imageState.mainImages.length === 0) return alert('메인 이미지는 최소 1개 이상 필요합니다.');
        if (!imageState.blueprintImage) return alert('도면 이미지는 필수입니다.');
        if (stations.length === 0) return alert('인근 지하철역을 최소 1개 이상 선택해야 합니다.');

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

        // [추가] 업로드 미완료 또는 실패 파일 체크
        const allImages = [
            ...imageState.mainImages,
            ...imageState.buildingImages,
            ...imageState.roomImages,
            ...(imageState.blueprintImage ? [imageState.blueprintImage] : []),
            ...imageState.commonOptionImages,
            ...imageState.individualOptionImages,
        ];

        if (allImages.some((img) => img.isUploading)) {
            return alert('아직 업로드 중인 이미지가 있습니다. 잠시 후 다시 시도해주세요.');
        }

        if (allImages.some((img) => !img.s3Key)) {
            return alert('업로드에 실패한 이미지가 있습니다. 해당 이미지를 삭제 후 다시 선택해주세요.');
        }

        if (!confirm('스튜디오를 생성하시겠습니까?')) return;

        setIsSubmitting(true);

        try {
            // 2. 이미 확보된 S3 Key들 수집
            const finalImageKeys = {
                mainImageKeys: imageState.mainImages.map((img) => img.s3Key!),
                buildingImageKeys: imageState.buildingImages.map((img) => img.s3Key!),
                roomImageKeys: imageState.roomImages.map((img) => img.s3Key!),
                blueprintImageKey: imageState.blueprintImage!.s3Key!,
                commonOptionImageKeys: imageState.commonOptionImages.map((img) => img.s3Key!),
                individualOptionImageKeys: imageState.individualOptionImages.map((img) => img.s3Key!),
            };

            // 3. 폼 데이터 구성 (이미지는 키로 대체되었으므로 JSON Payload 구성)
            const formData = new FormData(e.target as HTMLFormElement);

            const commonOptionCodes = formData.getAll('studioCommonOptionCodes').map(String);
            const individualOptionCodes = formData.getAll('studioIndividualOptionCodes').map(String);
            const optionCodes = [...commonOptionCodes, ...individualOptionCodes];
            const forbiddenInstrumentCodes = formData.getAll('forbiddenInstrumentCodes').map(String);

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

                    hasRestroom: toggleOptions.hasRestroom ? toggleOptions.hasRestroom === 'true' : null,
                    restroomLocation: toggleOptions.restroomLocation || null,
                    restroomGender: toggleOptions.restroomGender || null,

                    isLodgingAvailable: toggleOptions.isLodgingAvailable
                        ? toggleOptions.isLodgingAvailable === 'true'
                        : null,
                    hasFireInsurance: toggleOptions.hasFireInsurance ? toggleOptions.hasFireInsurance === 'true' : null,

                    parkingFeeType: formData.get('buildingInfo.parkingFeeType') || null,
                    parkingFeeInfo: formData.get('buildingInfo.parkingFeeInfo') || null,
                    parkingSpots: formData.get('buildingInfo.parkingSpots')
                        ? Number(formData.get('buildingInfo.parkingSpots'))
                        : null,
                    parkingLocationName: formData.get('buildingInfo.parkingLocationName') || null,
                    parkingLocationAddress: parkingAddress || null,
                },

                nearbyStations: stations,
                optionCodes: optionCodes,
                forbiddenInstrumentCodes: forbiddenInstrumentCodes,

                rooms: rooms.map((room) => ({
                    ...room,
                    widthMm: room.widthMm ? Number(room.widthMm) : null,
                    heightMm: room.heightMm ? Number(room.heightMm) : null,
                    roomBasePrice: room.roomBasePrice ? Number(room.roomBasePrice) : null,
                })),

                imageKeys: finalImageKeys, // [핵심] 수집한 키 전송
            };

            // 4. 생성 요청 (JSON 전송)
            const createRes = await fetch(`${API_BASE_URL}/api/admin/studios`, {
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
                                <div>
                                    <label className='block mb-1 font-medium'>최소 가격</label>
                                    <NumberInput name='studioMinPrice' className='w-full border p-2 rounded-md' />
                                </div>
                                <div>
                                    <label className='block mb-1 font-medium'>최대 가격</label>
                                    <NumberInput name='studioMaxPrice' className='w-full border p-2 rounded-md' />
                                </div>
                                <div>
                                    <label className='block mb-1 font-medium'>보증금</label>
                                    <NumberInput name='depositAmount' className='w-full border p-2 rounded-md' />
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
                                    <NumberInput
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

                                {toggleOptions.hasRestroom === 'true' && (
                                    <div className='pl-4 border-l-2 border-blue-200 space-y-3 mt-3'>
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

                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                <div>
                                    <label className='block mb-1 font-medium'>주차비 유형</label>
                                    <select name='buildingInfo.parkingFeeType' className='w-full border p-2 rounded-md'>
                                        <option value=''>선택</option>
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
                                    <NumberInput
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
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                        <div>
                                            <label className='block mb-1 font-medium'>
                                                사용 가능 여부
                                                {room.isAvailable !== null && (
                                                    <button
                                                        type='button'
                                                        onClick={() => handleRoomChange(index, 'isAvailable', null)}
                                                        className='ml-2 text-xs text-gray-400 underline'
                                                    >
                                                        초기화
                                                    </button>
                                                )}
                                            </label>
                                            <div className='flex gap-4'>
                                                <label className='flex items-center gap-2 cursor-pointer'>
                                                    <input
                                                        type='radio'
                                                        name={`rooms[${index}].isAvailable`}
                                                        value='true'
                                                        checked={room.isAvailable === true}
                                                        onClick={() => {
                                                            const nextVal = room.isAvailable === true ? null : true;
                                                            handleRoomChange(index, 'isAvailable', nextVal);
                                                        }}
                                                        onChange={() => {}}
                                                    />{' '}
                                                    가능
                                                </label>
                                                <label className='flex items-center gap-2 cursor-pointer'>
                                                    <input
                                                        type='radio'
                                                        name={`rooms[${index}].isAvailable`}
                                                        value='false'
                                                        checked={room.isAvailable === false}
                                                        onClick={() => {
                                                            const nextVal = room.isAvailable === false ? null : false;
                                                            handleRoomChange(index, 'isAvailable', nextVal);
                                                        }}
                                                        onChange={() => {}}
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
                                            <NumberInput
                                                value={room.widthMm}
                                                onChange={(e) => handleRoomChange(index, 'widthMm', e.target.value)}
                                                className='w-full border p-2 rounded-md'
                                            />
                                        </div>
                                        <div>
                                            <label className='block mb-1 font-medium'>세로(mm)</label>
                                            <NumberInput
                                                value={room.heightMm}
                                                onChange={(e) => handleRoomChange(index, 'heightMm', e.target.value)}
                                                className='w-full border p-2 rounded-md'
                                            />
                                        </div>
                                        <div>
                                            <label className='block mb-1 font-medium'>기본 가격</label>
                                            <NumberInput
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

                    {/* [수정] 이미지 정보 섹션 (즉시 업로드 로직 적용) */}
                    <fieldset className='border p-4 rounded-md'>
                        <legend className='font-bold text-lg px-2'>이미지 정보</legend>
                        <div className='p-2 space-y-4'>
                            {/* 메인 이미지 */}
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
                                    {imageState.mainImages.map((img) => (
                                        <div
                                            key={img.id}
                                            className='flex justify-between bg-gray-50 p-1 text-sm items-center'
                                        >
                                            <span className={img.isUploading ? 'text-gray-400' : 'text-black'}>
                                                {img.file.name} {img.isUploading && '(업로드 중...)'}
                                            </span>
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('mainImages', img.id)}
                                                className='text-red-500 px-2'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 건물 이미지 */}
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
                                    {imageState.buildingImages.map((img) => (
                                        <div
                                            key={img.id}
                                            className='flex justify-between bg-gray-50 p-1 text-sm items-center'
                                        >
                                            <span className={img.isUploading ? 'text-gray-400' : 'text-black'}>
                                                {img.file.name} {img.isUploading && '(업로드 중...)'}
                                            </span>
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('buildingImages', img.id)}
                                                className='text-red-500 px-2'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 룸 이미지 */}
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
                                    {imageState.roomImages.map((img) => (
                                        <div
                                            key={img.id}
                                            className='flex justify-between bg-gray-50 p-1 text-sm items-center'
                                        >
                                            <span className={img.isUploading ? 'text-gray-400' : 'text-black'}>
                                                {img.file.name} {img.isUploading && '(업로드 중...)'}
                                            </span>
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('roomImages', img.id)}
                                                className='text-red-500 px-2'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 도면 이미지 */}
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
                                {imageState.blueprintImage && (
                                    <div className='mt-1 flex justify-between bg-gray-50 p-1 text-sm items-center'>
                                        <span
                                            className={
                                                imageState.blueprintImage.isUploading ? 'text-gray-400' : 'text-black'
                                            }
                                        >
                                            {imageState.blueprintImage.file.name}{' '}
                                            {imageState.blueprintImage.isUploading && '(업로드 중...)'}
                                        </span>
                                        <button
                                            type='button'
                                            onClick={() =>
                                                removeSelectedFile('blueprintImage', imageState.blueprintImage!.id)
                                            }
                                            className='text-red-500 px-2'
                                        >
                                            X
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 공용 옵션 이미지 */}
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
                                    {imageState.commonOptionImages.map((img) => (
                                        <div
                                            key={img.id}
                                            className='flex justify-between bg-gray-50 p-1 text-sm items-center'
                                        >
                                            <span className={img.isUploading ? 'text-gray-400' : 'text-black'}>
                                                {img.file.name} {img.isUploading && '(업로드 중...)'}
                                            </span>
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('commonOptionImages', img.id)}
                                                className='text-red-500 px-2'
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 개별 옵션 이미지 */}
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
                                    {imageState.individualOptionImages.map((img) => (
                                        <div
                                            key={img.id}
                                            className='flex justify-between bg-gray-50 p-1 text-sm items-center'
                                        >
                                            <span className={img.isUploading ? 'text-gray-400' : 'text-black'}>
                                                {img.file.name} {img.isUploading && '(업로드 중...)'}
                                            </span>
                                            <button
                                                type='button'
                                                onClick={() => removeSelectedFile('individualOptionImages', img.id)}
                                                className='text-red-500 px-2'
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
