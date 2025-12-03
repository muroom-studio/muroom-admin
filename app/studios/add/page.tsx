'use client';

import { useState } from 'react';

export default function AddStudios() {
    const [stations, setStations] = useState([]);
    const [rooms, setRooms] = useState([
        { roomName: '', isAvailable: true, availableAt: '', widthMm: '', heightMm: '', roomBasePrice: '' }
    ]);

    const addStation = () => {
        if (stations.length >= 3) {
            alert('지하철역은 최대 3개까지 추가할 수 있습니다.');
            return;
        }
        setStations([...stations, { subwayStationId: '', sequence: '' }]);
    };

    const removeStation = (index) => {
        const newStations = stations.filter((_, i) => i !== index);
        setStations(newStations);
    };

    const addRoom = () => {
        setRooms([...rooms, { roomName: '', isAvailable: true, availableAt: '', widthMm: '', heightMm: '', roomBasePrice: '' }]);
    };

    const removeRoom = (index) => {
        if (rooms.length <= 1) {
            alert('룸은 최소 1개 이상이어야 합니다.');
            return;
        }
        const newRooms = rooms.filter((_, i) => i !== index);
        setRooms(newRooms);
    };


    return (
        <div className='flex min-h-screen items-center justify-center p-8'>
            <main className='w-full max-w-4xl'>
                <h1 className='text-2xl font-bold mb-10 text-center'>스튜디오 등록</h1>
                <form id="studio-create-form" className='space-y-6'>

                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-bold text-lg px-2">기본 정보</legend>
                        <div className="space-y-4 p-2">
                            <div>
                                <label htmlFor="studioName" className="block mb-1 font-medium">스튜디오 이름</label>
                                <input type="text" id="studioName" name="studioName" required className="w-full border p-2 rounded-md"/>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="studioMinPrice" className="block mb-1 font-medium">스튜디오 최소 가격</label>
                                    <input type="number" id="studioMinPrice" name="studioMinPrice" className="w-full border p-2 rounded-md"/>
                                </div>
                                <div>
                                    <label htmlFor="studioMaxPrice" className="block mb-1 font-medium">스튜디오 최대 가격</label>
                                    <input type="number" id="studioMaxPrice" name="studioMaxPrice" className="w-full border p-2 rounded-md"/>
                                </div>
                                <div>
                                    <label htmlFor="depositAmount" className="block mb-1 font-medium">보증금</label>
                                    <input type="number" id="depositAmount" name="depositAmount" className="w-full border p-2 rounded-md"/>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="introduction" className="block mb-1 font-medium">소개글</label>
                                <textarea id="introduction" name="introduction" rows="5" className="w-full border p-2 rounded-md"></textarea>
                            </div>
                            <div>
                                <label htmlFor="ownerPhoneNumber" className="block mb-1 font-medium">소유주 전화번호</label>
                                <input type="text" id="ownerPhoneNumber" name="ownerPhoneNumber" required className="w-full border p-2 rounded-md"/>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-bold text-lg px-2">주소 정보</legend>
                         <div className="space-y-4 p-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="roadAddress" className="block mb-1 font-medium">도로명 주소</label>
                                    <input type="text" id="roadAddress" name="addressInfo.roadAddress" required className="w-full border p-2 rounded-md"/>
                                </div>
                                <div>
                                    <label htmlFor="jibunAddress" className="block mb-1 font-medium">지번 주소</label>
                                    <input type="text" id="jibunAddress" name="addressInfo.jibunAddress" required className="w-full border p-2 rounded-md"/>
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="detailedAddress" className="block mb-1 font-medium">상세 주소</label>
                                    <input type="text" id="detailedAddress" name="addressInfo.detailedAddress" required className="w-full border p-2 rounded-md"/>
                                </div>
                                <div>
                                    <label htmlFor="zipCode" className="block mb-1 font-medium">우편번호</label>
                                    <input type="text" id="zipCode" name="addressInfo.zipCode" required className="w-full border p-2 rounded-md"/>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-bold text-lg px-2">건물 정보</legend>
                        <div className="space-y-4 p-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="floorType" className="block mb-1 font-medium">층 유형</label>
                                    <select id="floorType" name="buildingInfo.floorType" required className="w-full border p-2 rounded-md">
                                        <option value="ALL">여러 층</option>
                                        <option value="GROUND">지상</option>
                                        <option value="BASEMENT">지하</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="floorNumber" className="block mb-1 font-medium">층 번호</label>
                                    <input type="number" id="floorNumber" name="buildingInfo.floorNumber" required className="w-full border p-2 rounded-md"/>
                                </div>
                                <div>
                                    <label htmlFor="restroomType" className="block mb-1 font-medium">화장실 유형</label>
                                    <select id="restroomType" name="buildingInfo.restroomType" required className="w-full border p-2 rounded-md">
                                        <option value="INTERNAL">내부</option>
                                        <option value="EXTERNAL">외부</option>
                                        <option value="SHARED">공용</option>
                                        <option value="PRIVATE">단독</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-1 font-medium">주차 가능 여부</label>
                                    <div className="flex gap-4">
                                        <label><input type="radio" name="buildingInfo.isParkingAvailable" value="true" required/> 가능</label>
                                        <label><input type="radio" name="buildingInfo.isParkingAvailable" value="false" required/> 불가능</label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block mb-1 font-medium">숙소 가능 여부</label>
                                    <div className="flex gap-4">
                                        <label><input type="radio" name="buildingInfo.isLodgingAvailable" value="true" required/> 가능</label>
                                        <label><input type="radio" name="buildingInfo.isLodgingAvailable" value="false" required/> 불가능</label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block mb-1 font-medium">화재 보험 가입 여부</label>
                                    <div className="flex gap-4">
                                        <label><input type="radio" name="buildingInfo.hasFireInsurance" value="true" required/> 가입</label>
                                        <label><input type="radio" name="buildingInfo.hasFireInsurance" value="false" required/> 미가입</label>
                                    </div>
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="parkingFeeType" className="block mb-1 font-medium">주차비 유형</label>
                                    <select id="parkingFeeType" name="buildingInfo.parkingFeeType" required className="w-full border p-2 rounded-md">
                                        <option value="FREE">무료</option>
                                        <option value="PAID">유료</option>
                                        <option value="NONE">제공 안함</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="parkingFeeInfo" className="block mb-1 font-medium">주차비 정보</label>
                                    <input type="text" id="parkingFeeInfo" name="buildingInfo.parkingFeeInfo" className="w-full border p-2 rounded-md"/>
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="parkingSpots" className="block mb-1 font-medium">주차 가능 대수</label>
                                    <input type="number" id="parkingSpots" name="buildingInfo.parkingSpots" className="w-full border p-2 rounded-md"/>
                                </div>
                                 <div className="col-span-2">
                                    <label htmlFor="parkingLocationName" className="block mb-1 font-medium">주차장 이름</label>
                                    <input type="text" id="parkingLocationName" name="buildingInfo.parkingLocationName" className="w-full border p-2 rounded-md"/>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="parkingLocationAddress" className="block mb-1 font-medium">주차장 주소</label>
                                <input type="text" id="parkingLocationAddress" name="buildingInfo.parkingLocationAddress" className="w-full border p-2 rounded-md"/>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-bold text-lg px-2">인근 지하철역 (최대 3개)</legend>
                        <div id="nearby-stations-list" className="space-y-4 p-2">
                            {stations.map((station, index) => (
                                <div key={index} className="border-dashed p-3 rounded-md space-y-2 relative">
                                    <h4 className="font-semibold">지하철역 {index + 1}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block mb-1 font-medium">지하철역 ID</label>
                                            <input type="number" name={`nearbyStations[${index}].subwayStationId`} required className="w-full border p-2 rounded-md"/>
                                        </div>
                                        <div>
                                            <label className="block mb-1 font-medium">순서</label>
                                            <input type="number" name={`nearbyStations[${index}].sequence`} required className="w-full border p-2 rounded-md"/>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeStation(index)} className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">삭제</button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addStation} className="mt-2 bg-gray-600 text-white px-4 py-2 rounded-md">지하철역 추가</button>
                    </fieldset>

                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-bold text-lg px-2">스튜디오 옵션</legend>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-2">
                            {[
                                { code: "WATER_PURIFIER", name: "정수기" }, { code: "MICROWAVE", name: "전자레인지" },
                                { code: "WASHER", name: "세탁기" }, { code: "DRYER", name: "건조기" },
                                { code: "FRIDGE", name: "냉장고" }, { code: "SHOWER_ROOM", name: "샤워실" },
                                { code: "CCTV", name: "CCTV" }, { code: "WIFI", name: "WIFI" },
                                { code: "SNACK_BAR", name: "간식" }, { code: "SHOE_RACK", name: "신발장" },
                                { code: "VENTILATION", name: "환기시설" }, { code: "PRINTER", name: "프린트" },
                                { code: "COFFEE_MACHINE", name: "커피머신" }, { code: "DOOR_LOCK", name: "개인도어락" },
                                { code: "WINDOW", name: "창문" }, { code: "AIR_PURIFIER", name: "공기청정기" },
                                { code: "AIR_CONDITIONER", name: "에어컨" }, { code: "DEHUMIDIFIER", name: "제습기" },
                                { code: "LIGHTING", name: "조명시설" }, { code: "FLOOR_HEATING", name: "바닥난방" },
                                { code: "RADIATOR", name: "라디에이터" }, { code: "FULL_MIRROR", name: "전신거울" },
                                { code: "AMP", name: "앰프" }, { code: "KEYBOARD", name: "키보드" },
                                { code: "DRUM", name: "드럼" }, { code: "LOCKER", name: "개인보관함" },
                                { code: "LAN_PORT", name: "LAN포트" }
                            ].map(option => (
                                <label key={option.code} className="flex items-center gap-2">
                                    <input type="checkbox" name="optionCodes" value={option.code} />
                                    {option.name}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    
                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-bold text-lg px-2">금지 악기</legend>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 p-2">
                             {[
                                { code: "VOCAL", name: "보컬" }, { code: "GUITAR", name: "기타" },
                                { code: "BASS", name: "베이스" }, { code: "KEYBOARD", name: "키보드" },
                                { code: "DRUM", name: "드럼" }, { code: "PIANO", name: "피아노" },
                                { code: "BRASS_WIND", name: "관악" }, { code: "WOOD_WIND", name: "목관" },
                                { code: "STRINGS", name: "현악" }, { code: "VOCAL_PERFORMANCE", name: "성악" },
                                { code: "KR_TRADITIONAL", name: "국악" }, { code: "MIDI", name: "MIDI" },
                                { code: "ETC", name: "그 외" }
                            ].map(instrument => (
                                <label key={instrument.code} className="flex items-center gap-2">
                                    <input type="checkbox" name="forbiddenInstrumentCodes" value={instrument.code} />
                                    {instrument.name}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-bold text-lg px-2">룸 정보 (최소 1개)</legend>
                        <div id="rooms-list" className="space-y-4 p-2">
                            {rooms.map((room, index) => (
                                <div key={index} className="border-dashed p-3 rounded-md space-y-2 relative">
                                    <h4 className="font-semibold">룸 {index + 1}</h4>
                                    <div>
                                        <label className="block mb-1 font-medium">룸 이름</label>
                                        <input type="text" name={`rooms[${index}].roomName`} required className="w-full border p-2 rounded-md"/>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block mb-1 font-medium">사용 가능 여부</label>
                                            <div className="flex gap-4">
                                                <label><input type="radio" name={`rooms[${index}].isAvailable`} value="true" defaultChecked/> 가능</label>
                                                <label><input type="radio" name={`rooms[${index}].isAvailable`} value="false"/> 불가능</label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block mb-1 font-medium">입주 가능 날짜</label>
                                            <input type="date" name={`rooms[${index}].availableAt`} className="w-full border p-2 rounded-md"/>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block mb-1 font-medium">가로 길이 (mm)</label>
                                            <input type="number" name={`rooms[${index}].widthMm`} className="w-full border p-2 rounded-md"/>
                                        </div>
                                        <div>
                                            <label className="block mb-1 font-medium">세로 길이 (mm)</label>
                                            <input type="number" name={`rooms[${index}].heightMm`} className="w-full border p-2 rounded-md"/>
                                        </div>
                                        <div>
                                            <label className="block mb-1 font-medium">기본 가격</label>
                                            <input type="number" name={`rooms[${index}].roomBasePrice`} required className="w-full border p-2 rounded-md"/>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => removeRoom(index)} className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">삭제</button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addRoom} className="mt-2 bg-gray-600 text-white px-4 py-2 rounded-md">룸 추가</button>
                    </fieldset>

                    <fieldset className="border p-4 rounded-md">
                        <legend className="font-bold text-lg px-2">이미지 정보</legend>
                        <div className="p-2 space-y-4">
                            <p style={{color: '#d9534f'}}><strong>중요:</strong> 아래 파일들을 선택한 후, Presigned URL을 먼저 발급받아 파일을 업로드해야 합니다. 그 후 반환된 이미지 키(key)들을 다른 폼 데이터와 함께 서버에 전송합니다.</p>
                            
                            <div>
                                <label htmlFor="mainImageKeys" className="block mb-1 font-medium">메인 이미지 (1~3개)</label>
                                <input type="file" id="mainImageKeys" name="mainImageFiles" multiple accept="image/*" className="w-full"/>
                                <input type="hidden" name="imageKeys.mainImageKeys" />
                            </div>

                            <div>
                                <label htmlFor="buildingImageKeys" className="block mb-1 font-medium">건물 이미지 (최대 4개)</label>
                                <input type="file" id="buildingImageKeys" name="buildingImageFiles" multiple accept="image/*" className="w-full"/>
                                <input type="hidden" name="imageKeys.buildingImageKeys" />
                            </div>

                            <div>
                                <label htmlFor="roomImageKeys" className="block mb-1 font-medium">룸 이미지 (최대 20개)</label>
                                <input type="file" id="roomImageKeys" name="roomImageFiles" multiple accept="image/*" className="w-full"/>
                                <input type="hidden" name="imageKeys.roomImageKeys" />
                            </div>
                            
                            <div>
                                <label htmlFor="blueprintImageKey" className="block mb-1 font-medium">도면 이미지 (필수 1개)</label>
                                <input type="file" id="blueprintImageKey" name="blueprintImageFile" accept="image/*" className="w-full"/>
                                <input type="hidden" name="imageKeys.blueprintImageKey" />
                            </div>
                        </div>
                    </fieldset>

                    <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-md font-bold hover:bg-blue-700">스튜디오 생성</button>

                </form>
            </main>
        </div>
    );
}
