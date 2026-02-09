import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import api from '../lib/axios';

// 기본 제품 유형 옵션 (사용자가 직접 입력도 가능)
const PRODUCT_TYPE_OPTIONS = ['DB', 'WEB/WAS', 'OS', '네트워크', '보안', '클라우드', '기타'];

export default function ProductManagementPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ product_type: '', product_name: '' });
  const [customType, setCustomType] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/products', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.message || '생성 실패'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/products/${id}`, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (err) => setError(err.response?.data?.message || '수정 실패'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    onError: (err) => alert(err.response?.data?.message || '삭제 실패'),
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({ product_type: '', product_name: '' });
    setCustomType(false);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    const isCustom = !PRODUCT_TYPE_OPTIONS.includes(product.product_type);
    setCustomType(isCustom);
    setForm({
      product_type: product.product_type,
      product_name: product.product_name,
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setForm({ product_type: '', product_name: '' });
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.product_id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (product) => {
    if (window.confirm(`'${product.product_name}' 제품을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(product.product_id);
    }
  };

  // 유형별 고유 목록
  const productTypes = [...new Set(productsData?.map(p => p.product_type) || [])];

  // 필터링된 제품 목록
  const filteredProducts = filterType
    ? productsData?.filter(p => p.product_type === filterType)
    : productsData;

  // 유형별 그룹핑
  const groupedProducts = {};
  filteredProducts?.forEach(p => {
    if (!groupedProducts[p.product_type]) groupedProducts[p.product_type] = [];
    groupedProducts[p.product_type].push(p);
  });

  const typeColors = {
    'DB': 'bg-blue-100 text-blue-700',
    'WEB/WAS': 'bg-green-100 text-green-700',
    'OS': 'bg-orange-100 text-orange-700',
    '네트워크': 'bg-purple-100 text-purple-700',
    '보안': 'bg-red-100 text-red-700',
    '클라우드': 'bg-cyan-100 text-cyan-700',
  };

  const getTypeColor = (type) => typeColors[type] || 'bg-gray-100 text-gray-700';

  return (
    <>
      <Header title="제품 관리" />
      <div className="mt-6 space-y-4">
        {/* 상단 액션 바 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">전체 유형</option>
              {productTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              총 {filteredProducts?.length || 0}개 제품
            </span>
          </div>
          <button onClick={openCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + 제품 등록
          </button>
        </div>

        {/* 제품 목록 (유형별 그룹) */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : Object.keys(groupedProducts).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedProducts).map(([type, products]) => (
              <div key={type} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getTypeColor(type)}`}>
                      {type}
                    </span>
                    <span className="text-sm text-gray-500">{products.length}개 제품</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {products.map((product) => (
                    <div key={product.product_id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-500">
                          {product.product_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{product.product_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(product)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          수정
                        </button>
                        <button onClick={() => handleDelete(product)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium">
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            <p className="text-lg mb-2">등록된 제품이 없습니다.</p>
            <p className="text-sm">제품을 등록하면 작업 로그 작성 시 선택할 수 있습니다.</p>
          </div>
        )}
      </div>

      {/* 제품 생성/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingProduct ? '제품 수정' : '제품 등록'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품 유형 *</label>
                {!customType ? (
                  <div className="flex gap-2">
                    <select
                      value={form.product_type}
                      onChange={(e) => setForm(p => ({ ...p, product_type: e.target.value }))}
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">선택하세요</option>
                      {PRODUCT_TYPE_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setCustomType(true); setForm(p => ({ ...p, product_type: '' })); }}
                      className="px-3 py-2 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                    >
                      직접 입력
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.product_type}
                      onChange={(e) => setForm(p => ({ ...p, product_type: e.target.value }))}
                      required
                      placeholder="제품 유형 입력 (예: DB, WEB/WAS)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => { setCustomType(false); setForm(p => ({ ...p, product_type: '' })); }}
                      className="px-3 py-2 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      목록 선택
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품명 *</label>
                <input
                  type="text"
                  value={form.product_name}
                  onChange={(e) => setForm(p => ({ ...p, product_name: e.target.value }))}
                  required
                  placeholder="예: Oracle, Tibero, JEUS, CentOS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors">
                  취소
                </button>
                <button type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {editingProduct ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
