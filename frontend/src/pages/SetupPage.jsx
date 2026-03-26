import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo-beyond.png';
import api from '../lib/axios';

const DEFAULT_PRODUCTS = [
  { product_type: 'DB', product_name: 'Oracle' },
  { product_type: 'DB', product_name: 'Tibero' },
  { product_type: 'DB', product_name: 'PostgreSQL' },
  { product_type: 'DB', product_name: 'MySQL' },
  { product_type: 'DB', product_name: 'MariaDB' },
  { product_type: 'DB', product_name: 'MS-SQL' },
  { product_type: 'OS', product_name: 'CentOS' },
  { product_type: 'OS', product_name: 'RHEL' },
  { product_type: 'OS', product_name: 'Ubuntu' },
  { product_type: 'OS', product_name: 'Windows Server' },
  { product_type: 'OS', product_name: 'Rocky Linux' },
  { product_type: 'WEB/WAS', product_name: 'Jeus' },
  { product_type: 'WEB/WAS', product_name: 'WebtoB' },
  { product_type: 'WEB/WAS', product_name: 'Tomcat' },
  { product_type: 'WEB/WAS', product_name: 'Apache' },
  { product_type: 'WEB/WAS', product_name: 'Nginx' },
  { product_type: 'WEB/WAS', product_name: 'WebLogic' },
  { product_type: 'Network', product_name: 'L4 Switch' },
  { product_type: 'Network', product_name: 'DNS' },
  { product_type: 'Security', product_name: '방화벽' },
  { product_type: 'Security', product_name: 'WAF' },
  { product_type: 'Cloud', product_name: 'AWS' },
  { product_type: 'Cloud', product_name: 'Azure' },
  { product_type: 'Cloud', product_name: 'NCP' },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: 관리자 정보
  const [admin, setAdmin] = useState({
    email: '',
    name: '',
    password: '',
    passwordConfirm: '',
    position: '',
  });

  // Step 2: 부서
  const [departments, setDepartments] = useState(['']);

  // Step 3: 제품
  const [useDefaultProducts, setUseDefaultProducts] = useState(true);
  const [customProducts, setCustomProducts] = useState([{ product_type: '', product_name: '' }]);

  const handleAdminChange = (e) => {
    setAdmin((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDeptChange = (index, value) => {
    setDepartments((prev) => prev.map((d, i) => (i === index ? value : d)));
  };

  const addDept = () => setDepartments((prev) => [...prev, '']);
  const removeDept = (index) => {
    if (departments.length <= 1) return;
    setDepartments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index, field, value) => {
    setCustomProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const addProduct = () =>
    setCustomProducts((prev) => [...prev, { product_type: '', product_name: '' }]);
  const removeProduct = (index) => {
    if (customProducts.length <= 1) return;
    setCustomProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const validateStep1 = () => {
    if (!admin.email || !admin.name || !admin.password) {
      setError('이메일, 이름, 비밀번호는 필수입니다.');
      return false;
    }
    if (admin.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return false;
    }
    if (admin.password !== admin.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const validDepts = departments.filter((d) => d.trim());
    if (validDepts.length === 0) {
      setError('최소 1개 이상의 부서를 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => {
    setError('');
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    const validDepts = departments.filter((d) => d.trim()).map((d) => d.trim());
    const products = useDefaultProducts
      ? DEFAULT_PRODUCTS
      : customProducts.filter((p) => p.product_type.trim() && p.product_name.trim());

    try {
      await api.post('/setup/initialize', {
        admin: {
          email: admin.email,
          name: admin.name,
          password: admin.password,
          position: admin.position || '관리자',
        },
        departments: validDepts,
        products,
      });
      navigate('/login', { state: { setupComplete: true } });
    } catch (err) {
      setError(err.response?.data?.message || '초기 설정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* 로고 */}
        <div className="text-center mb-8">
          <img src={logoImg} alt="BeTS" className="h-16 w-auto mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">BeTS 초기 설정</h1>
          <p className="mt-1 text-sm text-gray-600">시스템을 처음 사용하기 위한 초기 설정입니다</p>
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === s
                    ? 'bg-blue-600 text-white'
                    : step > s
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-gray-500 mb-6">
          {step === 1 && '관리자 계정 설정'}
          {step === 2 && '부서 설정'}
          {step === 3 && '제품 설정'}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: 관리자 계정 */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">관리자 계정</h3>
            <p className="text-sm text-gray-500">시스템 관리에 사용할 관리자 계정을 생성합니다.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
              <input
                type="email" name="email" value={admin.email} onChange={handleAdminChange}
                placeholder="admin@company.com" required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
              <input
                type="text" name="name" value={admin.name} onChange={handleAdminChange}
                placeholder="홍길동" required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">직급</label>
              <input
                type="text" name="position" value={admin.position} onChange={handleAdminChange}
                placeholder="팀장"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 *</label>
              <input
                type="password" name="password" value={admin.password} onChange={handleAdminChange}
                placeholder="6자 이상" required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인 *</label>
              <input
                type="password" name="passwordConfirm" value={admin.passwordConfirm} onChange={handleAdminChange}
                placeholder="비밀번호 재입력" required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        )}

        {/* Step 2: 부서 */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">부서 설정</h3>
            <p className="text-sm text-gray-500">사용할 부서를 등록합니다. 나중에 추가/수정할 수 있습니다.</p>
            {departments.map((dept, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text" value={dept}
                  onChange={(e) => handleDeptChange(i, e.target.value)}
                  placeholder={`부서명 ${i + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {departments.length > 1 && (
                  <button type="button" onClick={() => removeDept(i)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium px-2">
                    삭제
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addDept}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              + 부서 추가
            </button>
          </div>
        )}

        {/* Step 3: 제품 */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">제품 설정</h3>
            <p className="text-sm text-gray-500">작업 내역 등록 시 선택할 제품 목록입니다.</p>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={useDefaultProducts}
                  onChange={() => setUseDefaultProducts(true)}
                  className="text-blue-600" />
                <span className="text-sm">기본 제품 목록 사용</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!useDefaultProducts}
                  onChange={() => setUseDefaultProducts(false)}
                  className="text-blue-600" />
                <span className="text-sm">직접 입력</span>
              </label>
            </div>

            {useDefaultProducts ? (
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <p className="text-xs text-gray-500 mb-2">등록될 제품 ({DEFAULT_PRODUCTS.length}개):</p>
                <div className="grid grid-cols-2 gap-1">
                  {DEFAULT_PRODUCTS.map((p, i) => (
                    <span key={i} className="text-xs text-gray-600">
                      [{p.product_type}] {p.product_name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {customProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text" value={p.product_type}
                      onChange={(e) => handleProductChange(i, 'product_type', e.target.value)}
                      placeholder="유형 (DB, OS...)"
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <input
                      type="text" value={p.product_name}
                      onChange={(e) => handleProductChange(i, 'product_name', e.target.value)}
                      placeholder="제품명"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    {customProducts.length > 1 && (
                      <button type="button" onClick={() => removeProduct(i)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium px-2">
                        삭제
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addProduct}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  + 제품 추가
                </button>
              </div>
            )}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {step > 1 && (
              <button onClick={handleBack}
                className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
                이전
              </button>
            )}
          </div>
          <div>
            {step < 3 ? (
              <button onClick={handleNext}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                다음
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {loading ? '설정 중...' : '설정 완료'}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          © 2026 비욘드데이터(주). All rights reserved.
        </p>
      </div>
    </div>
  );
}
