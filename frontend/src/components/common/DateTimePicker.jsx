import { useState, useEffect, useRef } from 'react';

/**
 * 커스텀 날짜/시간 선택 컴포넌트
 * 날짜와 시간을 각각 선택할 수 있는 직관적인 UI
 */
export default function DateTimePicker({ value, onChange, name, required, accentColor = 'blue' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('09');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [viewDate, setViewDate] = useState(new Date());
  const containerRef = useRef(null);

  // value가 변경될 때 파싱
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${year}-${month}-${day}`);
        setSelectedHour(String(d.getHours()).padStart(2, '0'));
        setSelectedMinute(String(d.getMinutes()).padStart(2, '0'));
        setViewDate(d);
      }
    }
  }, [value]);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const emitChange = (date, hour, minute) => {
    if (date) {
      const datetimeStr = `${date}T${hour}:${minute}`;
      onChange({ target: { name, value: datetimeStr } });
    }
  };

  const handleDateSelect = (day) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    setSelectedDate(dateStr);
    emitChange(dateStr, selectedHour, selectedMinute);
  };

  const handleHourChange = (h) => {
    setSelectedHour(h);
    emitChange(selectedDate, h, selectedMinute);
  };

  const handleMinuteChange = (m) => {
    setSelectedMinute(m);
    emitChange(selectedDate, selectedHour, m);
  };

  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setViewDate(now);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    setSelectedDate(dateStr);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    emitChange(dateStr, hour, minute);
  };

  // 달력 데이터 생성
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  // 표시 텍스트
  const displayText = value
    ? (() => {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      })()
    : '';

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  const ringColor = accentColor === 'red' ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500';
  const accentBg = accentColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700';
  const accentBgLight = accentColor === 'red' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700';
  const accentBgSelected = accentColor === 'red' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white';

  return (
    <div ref={containerRef} className="relative">
      {/* 입력 필드 */}
      <div
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg cursor-pointer flex items-center gap-2 text-sm
                    hover:border-gray-400 transition-colors ${ringColor} ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={displayText ? 'text-gray-900' : 'text-gray-400'}>
          {displayText || '날짜 및 시간을 선택하세요'}
        </span>
        {displayText && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ target: { name, value: '' } });
              setSelectedDate('');
            }}
            className="ml-auto text-gray-300 hover:text-gray-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 히든 input (form validation용) */}
      {required && (
        <input
          type="text"
          value={value || ''}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* 드롭다운 패널 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-[340px] animate-in fade-in-0 zoom-in-95">
          {/* 달력 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={goToPrevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {year}년 {monthNames[month]}
            </span>
            <button type="button" onClick={goToNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {weekDays.map((d, i) => (
              <div key={d}
                className={`text-center text-xs font-medium py-1 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-0.5 mb-3">
            {days.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = dayStr === selectedDate;
              const isToday = dayStr === todayStr;
              const dayOfWeek = (firstDay + day - 1) % 7;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={`h-8 w-full rounded-lg text-sm font-medium transition-all
                    ${isSelected
                      ? `${accentBgSelected} shadow-sm`
                      : isToday
                        ? `${accentBgLight} font-bold`
                        : dayOfWeek === 0
                          ? 'text-red-500 hover:bg-gray-50'
                          : dayOfWeek === 6
                            ? 'text-blue-500 hover:bg-gray-50'
                            : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* 구분선 */}
          <div className="border-t border-gray-100 my-3"></div>

          {/* 시간 선택 */}
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex items-center gap-1">
              <select
                value={selectedHour}
                onChange={(e) => handleHourChange(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 hover:bg-gray-100 cursor-pointer appearance-none text-center w-16"
              >
                {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                  <option key={h} value={h}>{h}시</option>
                ))}
              </select>
              <span className="text-gray-400 font-bold text-lg">:</span>
              <select
                value={selectedMinute}
                onChange={(e) => handleMinuteChange(e.target.value)}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 hover:bg-gray-100 cursor-pointer appearance-none text-center w-16"
              >
                {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                  <option key={m} value={m}>{m}분</option>
                ))}
              </select>
            </div>
            <div className="ml-auto flex gap-1">
              <button type="button" onClick={goToToday}
                className="text-xs px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                현재
              </button>
              <button type="button" onClick={() => setIsOpen(false)}
                className={`text-xs px-2.5 py-1.5 ${accentBg} text-white rounded-lg transition-colors font-medium`}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
